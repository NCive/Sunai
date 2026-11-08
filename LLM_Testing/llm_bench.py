import argparse
import csv
import gc
import json
import math
import os
import re
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast

os.environ["TORCH_ROCM_AOTRITON_ENABLE_EXPERIMENTAL"] = "1"

# ==================================================
# 1. CONFIGURATION
# ==================================================

# Check the exact names on Hugging Face before a long run.
MODELS = [
    "google/gemma-3-1b-it",
    "openbmb/MiniCPM5-2B",
    "meta-llama/Llama-3.2-3B-Instruct",
    "HuggingFaceTB/SmolLM3-3B",
    "facebook/MobileMoE-S-QAT",
    "Qwen/Qwen3.5-4B",
    "google/gemma-3-4b-it",
]

# Per-model overrides. Gemma can give NaN in float16; try "dtype": "bfloat16".
# Remove trust_remote_code if the model does not need it.
MODEL_OPTS: dict[str, dict[str, bool | str]] = {
    "facebook/MobileMoE-S-QAT": {"trust_remote_code": True},
}

DEFAULT_DTYPE = "float16"
DEVICE: str = "cuda:0"
BATCH_SIZE = 1       # lm-eval batch on the GGUF path
LM_BATCH_SIZE = 8    # lm-eval batch on the HF path. Lower it if you run out of memory.
CUSTOM_BATCH = 8     # custom tests batch on the HF path
RESULTS_DIR = Path("results")
DEFAULT_BACKEND = "hf"
DEFAULT_SERVER_URL = "http://127.0.0.1:8080"
GGUF_MODEL = (
    r"D:\Python Projects\Gnani AI\Sunai\Models\hub"
    r"\models--unsloth--Qwen3.5-4B-GGUF\snapshots"
    r"\e87f176479d0855a907a41277aca2f8ee7a09523"
    r"\Qwen3.5-4B-UD-Q5_K_XL.gguf"
)

# limit = number of questions per task (None = full dataset).
PROFILES = {
    "quick": {"mc": {"boolq": 200, "hellaswag": 200}, "gen": {"ifeval": 100},
              "ppl_max_chars": 150_000, "speed_repeats": 3},
    "full": {"mc": {"boolq": None, "hellaswag": None}, "gen": {"ifeval": None},
             "ppl_max_chars": None, "speed_repeats": 5},
}

# Extra lm-eval tasks. Check the name exists in your lm-eval version.
LANG_TASKS = {"xnli_hi": 200}

# Perplexity
PPL_DATASET, PPL_CONFIG, PPL_SPLIT = "Salesforce/wikitext", "wikitext-2-raw-v1", "test"
PPL_CONTEXT = 1024
PPL_STRIDE = 512
LLAMA_PERPLEXITY_BIN = (
    r"C:\Users\neild\AppData\Local\Microsoft\WinGet\Packages"
    r"\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\llama-perplexity.exe"
)
PPL_TOKENIZER = "Qwen/Qwen3.5-4B"   # only used to count tokens for bits per byte

# Speed
SPEED_PROMPT = "Explain how a neural network learns, step by step."
LONG_PROMPT_TOKENS = 1024
MAX_NEW_TOKENS = 128
WARMUP_RUNS = 2

# Which lm-eval metric to show in the summary
PREFERRED_METRIC = {
    "hellaswag": "acc_norm,none",
    "boolq": "acc,none",
    # "ifeval": "prompt_level_strict_acc,none",
    "xnli_hi": "acc,none",
}


# ==================================================
# 2. CUSTOM RULES + LANGUAGE TESTS (auto-checked)
# ==================================================

def devanagari_ratio(text):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    return sum("\u0900" <= c <= "\u097F" for c in letters) / len(letters)

def is_json_keys(out, keys):
    try:
        data = json.loads(out.strip())
        return isinstance(data, dict) and set(data.keys()) == keys
    except Exception:
        return False

def bullets_ok(out):
    lines = [l for l in out.strip().splitlines() if l.strip()]
    return len(lines) == 3 and all(l.lstrip().startswith("- ") for l in lines)

def ends_with_word(out, word):
    return re.search(rf"\b{re.escape(word)}[.!?]*$", out.strip(), re.IGNORECASE) is not None

def clean_word(out):
    return out.strip().strip(".!\"' ")

CUSTOM_TESTS = [
    # ----- rules / instruction following -----
    ("rules", "Reply with only valid JSON with the keys name and age for a person called Sam aged 30. No other text.",
     lambda o: is_json_keys(o, {"name", "age"})),
    ("rules", "Write exactly 3 bullet points about the benefits of sleep. Start each bullet with '- '. No other text.",
     bullets_ok),
    ("rules", "Answer in all lowercase letters only: why is Paris famous?",
     lambda o: o == o.lower() and any(c.isalpha() for c in o)),
    ("rules", "Describe the sea in fewer than 20 words.",
     lambda o: 0 < len(o.split()) < 20),
    ("rules", "Write one sentence about dogs that ends with the word 'bone'.",
     lambda o: ends_with_word(o, "bone")),
    ("rules", "Write a two-line poem about rain. Do not use the word 'water'.",
     lambda o: "water" not in o.lower() and len([l for l in o.splitlines() if l.strip()]) == 2),
    ("rules", "Reply with exactly one word, yes or no: is the sky usually blue on a clear day?",
     lambda o: clean_word(o).lower() == "yes"),
    ("rules", "List the numbers 1 to 5 separated by commas. Nothing else.",
     lambda o: re.fullmatch(r"1,\s*2,\s*3,\s*4,\s*5", o.strip()) is not None),
    ("rules", "Write the word banana in capital letters and nothing else.",
     lambda o: clean_word(o) == "BANANA"),
    ("rules", "Write a title wrapped in double angle brackets like <<title>>, then one sentence about tea.",
     lambda o: re.search(r"<<[^<>]+>>", o) is not None),
    ("rules", "What is 17 + 26? Reply with only the number.",
     lambda o: clean_word(o) == "43"),
    # ----- language -----
    ("lang", "Answer in Hindi only (Devanagari script): What is the capital of India?",
     lambda o: devanagari_ratio(o) > 0.6 and "\u0926\u093f\u0932\u094d\u0932\u0940" in o),
    ("lang", "\u0939\u093f\u0902\u0926\u0940 \u092e\u0947\u0902 \u0926\u094b \u0935\u093e\u0915\u094d\u092f \u0932\u093f\u0916\u093f\u090f: \u0906\u092a\u0915\u093e \u092a\u0938\u0902\u0926\u0940\u0926\u093e \u092b\u0932 \u0915\u094c\u0928 \u0938\u093e \u0939\u0948?",
     lambda o: devanagari_ratio(o) > 0.6),
    # Marathi and Hindi both use Devanagari, so this only checks the script, not the language.
    ("lang", "\u092e\u0930\u093e\u0920\u0940\u0924 \u090f\u0915 \u0935\u093e\u0915\u094d\u092f \u0932\u093f\u0939\u093e: \u092a\u093e\u090a\u0938 \u0915\u0938\u093e \u0905\u0938\u0924\u094b?",
     lambda o: devanagari_ratio(o) > 0.6),
    ("lang", "R\u00e9ponds en fran\u00e7ais uniquement : quelle est la capitale de l'Espagne ?",
     lambda o: "madrid" in o.lower() and " the " not in f" {o.lower()} "),
    ("lang", "Responde solo en espa\u00f1ol: \u00bfcu\u00e1l es la capital de Italia?",
     lambda o: "roma" in o.lower() and " the " not in f" {o.lower()} "),
    ("lang", "Antworte nur auf Deutsch: Was ist die Hauptstadt von Deutschland?",
     lambda o: "berlin" in o.lower() and " the " not in f" {o.lower()} "),
    ("lang", "Translate to English: 'Je mange une pomme.'",
     lambda o: "apple" in o.lower()),
]


# ==================================================
# 3. SHARED HELPERS
# ==================================================

def slug(model_id):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", model_id)

def sync(torch):
    if torch.cuda.is_available():
        torch.cuda.synchronize()

def all_lm_tasks(profile):
    return list(profile["mc"]) + list(profile["gen"]) + list(LANG_TASKS)

def median_of(samples, key):
    values = [s[key] for s in samples if isinstance(s.get(key), (int, float))]
    return statistics.median(values) if values else None

def build_prompt(tok, text):
    """Return (prompt_string, add_special_tokens). Avoids a double BOS token."""
    if getattr(tok, "chat_template", None):
        msgs = [{"role": "user", "content": text}]
        try:
            # enable_thinking=False is ignored by templates that do not use it.
            p = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True,
                                        enable_thinking=False)
        except Exception:
            p = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
        return p, False
    return text, True

def load_ppl_text(max_chars):
    from datasets import load_dataset
    ds = load_dataset(PPL_DATASET, PPL_CONFIG, split=PPL_SPLIT)
    text_parts = []
    for row in ds:
        text = cast(dict[str, str], row)["text"]
        if text.strip():
            text_parts.append(text)
    text = "\n\n".join(text_parts)
    return text[:max_chars] if max_chars else text

def score_custom(outputs):
    detail, score = [], {"rules": [0, 0], "lang": [0, 0]}
    for (cat, prompt, check), out in zip(CUSTOM_TESTS, outputs):
        try:
            ok = bool(check(out))
        except Exception:
            ok = False
        score[cat][0] += int(ok)
        score[cat][1] += 1
        detail.append({"cat": cat, "prompt": prompt, "output": out[:300], "pass": ok})
    return {"rules_pct": 100 * score["rules"][0] / score["rules"][1],
            "lang_pct": 100 * score["lang"][0] / score["lang"][1],
            "detail": detail}

def load_report(path, **ident):
    """Reuse an old report only if it matches ident (same backend/model/profile)."""
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        report = {}
    if any(report.get(k) != v for k, v in ident.items()):
        report = {}
    report.update(ident, timestamp=datetime.now(timezone.utc).isoformat())
    report.setdefault("errors", {})
    return report

def save_report(path, report):
    path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

def should_skip(report, stage, key, force, lm_tasks):
    if force:
        return False
    if stage == "lm":
        lm = report.get("lm_eval", {})
        return all(isinstance(lm.get(t), dict) and "error" not in lm[t] for t in lm_tasks)
    return key in report and stage not in report["errors"]

def run_stages(path, report, plan, stages, force, lm_tasks):
    """Run each stage in plan, skip finished ones, save after every stage."""
    for stage, key, fn in plan:
        if stage not in stages:
            continue
        if should_skip(report, stage, key, force, lm_tasks):
            print(f"[{stage}] Already completed; skipping.")
            continue
        print(f"[{stage}]")
        try:
            result = fn()
            if stage == "lm":
                report.setdefault("lm_eval", {}).update(result)
            else:
                report[key] = result
            report["errors"].pop(stage, None)
            print(f"  {stage}: completed")
        except Exception as e:
            if stage == "lm":
                report.setdefault("lm_eval", {}).update(
                    {t: {"error": str(e)[:300]} for t in lm_tasks})
            else:
                report.pop(key, None)
            report["errors"][stage] = str(e)[:500]
            print(f"  {stage} failed: {e}")
        save_report(path, report)


# ==================================================
# 4. LLAMA.CPP BACKEND
# ==================================================

def _join(content):
    """Message content can be a string or a list of text parts."""
    if isinstance(content, list):
        return "".join(i.get("text", "") for i in content if isinstance(i, dict))
    return content or ""

def llama_chat(server_url, prompt, max_tokens=128, stream=False):
    """Call llama.cpp's OpenAI-compatible chat completions endpoint."""
    payload = {
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0,
        "max_tokens": max_tokens,
        "stream": stream,
        "cache_prompt": False,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    if stream:
        payload["stream_options"] = {"include_usage": True}

    request = urllib.request.Request(
        server_url.rstrip("/") + "/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        response = urllib.request.urlopen(request, timeout=600)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"llama-server HTTP {e.code}: {detail[:500]}") from e

    with response:
        if not stream:
            data = json.loads(response.read().decode("utf-8"))
            choice = data["choices"][0]
            message = choice.get("message", {})
            content = _join(message.get("content"))
            if not content:
                raise RuntimeError(
                    "llama-server returned no visible message content. "
                    f"finish_reason={choice.get('finish_reason')}; "
                    f"message_fields={list(message.keys())}")
            return {"text": content.strip(), "usage": data.get("usage", {}),
                    "timings": data.get("timings", {}),
                    "finish_reason": choice.get("finish_reason")}

        # Streaming: measure time to first visible generated content.
        start = time.perf_counter()
        first, chunks, usage = None, [], {}
        for raw_line in response:
            line = raw_line.decode("utf-8", errors="replace").strip()
            if not line.startswith("data:"):
                continue
            value = line[5:].strip()
            if value == "[DONE]":
                break
            try:
                chunk = json.loads(value)
            except json.JSONDecodeError:
                continue
            usage = chunk.get("usage") or usage
            for choice in chunk.get("choices", []):
                piece = _join(choice.get("delta", {}).get("content"))
                if piece:
                    first = first or time.perf_counter()
                    chunks.append(piece)
    end = time.perf_counter()

    if first is None:
        raise RuntimeError("No visible content received from streaming response.")
    return {"text": "".join(chunks), "usage": usage,
            "ttft_ms": (first - start) * 1000, "total_ms": (end - start) * 1000}

def run_custom_llama(server_url):
    outputs = []
    for _, prompt, _ in CUSTOM_TESTS:
        try:
            outputs.append(llama_chat(server_url, prompt, max_tokens=120)["text"])
        except Exception as e:
            print(f"  custom test failed: {str(e)[:100]}")
            outputs.append("")
    return score_custom(outputs)

def run_speed_llama(server_url, repeats):
    prompts = {
        "short": SPEED_PROMPT,
        "long": "Neural networks learn by adjusting weights to reduce error. " * 100,
    }
    for _ in range(WARMUP_RUNS):
        llama_chat(server_url, SPEED_PROMPT, max_tokens=16)

    results = {}
    for name, prompt in prompts.items():
        samples = []
        for _ in range(repeats):
            r = llama_chat(server_url, prompt, max_tokens=MAX_NEW_TOKENS, stream=True)
            pt = r["usage"].get("prompt_tokens")
            ct = r["usage"].get("completion_tokens")
            ttft, total = r["ttft_ms"], r["total_ms"]
            decode_ms = max(total - ttft, 0.001)
            samples.append({
                "prompt_tokens": pt,
                "completion_tokens": ct,
                "ttft_ms": ttft,
                "prompt_tokens_per_s": pt / (ttft / 1000) if pt else None,
                "decode_tokens_per_s": max(ct - 1, 0) / (decode_ms / 1000) if ct else None,
                "total_ms": total,
            })
        keys = ("prompt_tokens", "completion_tokens", "ttft_ms",
                "prompt_tokens_per_s", "decode_tokens_per_s", "total_ms")
        results[name] = {k: median_of(samples, k) for k in keys} | {"samples": samples}
    return results

def run_ppl_llama(model_path, max_chars):
    text = load_ppl_text(max_chars)
    ppl_file = RESULTS_DIR / "ppl_text.txt"
    # newline="" stops Windows from turning \n into \r\n (that would change the text)
    with open(ppl_file, "w", encoding="utf-8", newline="") as f:
        f.write(text)

    cmd = [
        LLAMA_PERPLEXITY_BIN,
        "-m", str(model_path),
        "-f", str(ppl_file),
        "-c", str(PPL_CONTEXT),
        "--ppl-stride", str(PPL_STRIDE),
        "-ngl", "99",
        "-b", "512",
        "-ub", "128",
    ]
    print("  Running:", " ".join(cmd))
    proc = subprocess.run(cmd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace")
    output = proc.stdout + "\n" + proc.stderr
    (RESULTS_DIR / "ppl_llama_log.txt").write_text(output, encoding="utf-8")
    if proc.returncode != 0:
        raise RuntimeError(f"llama-perplexity failed (exit {proc.returncode}); "
                           "see results/ppl_llama_log.txt")

    m = re.search(r"Final estimate: PPL\s*=\s*([0-9.]+)", output)
    if not m:
        raise RuntimeError("No 'Final estimate: PPL' in output; see results/ppl_llama_log.txt")
    ppl = float(m.group(1))

    result = {"perplexity_per_token": ppl, "context": PPL_CONTEXT,
              "stride": PPL_STRIDE, "chars": len(text)}
    # Approximate bits per byte: needs the token count of the same text
    try:
        from transformers import AutoTokenizer
        tok = AutoTokenizer.from_pretrained(PPL_TOKENIZER)
        n_tokens = len(tok(text, add_special_tokens=False)["input_ids"])
        result["bits_per_byte"] = math.log2(ppl) * n_tokens / len(text.encode("utf-8"))
        result["tokens_counted"] = n_tokens
        result["bpb_note"] = "approximate"
    except Exception as e:
        result["bpb_error"] = str(e)[:200]
    return result

def run_lm_eval_gguf(server_url, profile_name, selected_tasks, name):
    """Run lm-eval against a llama.cpp server using its GGUF backend."""
    limits = {**PROFILES[profile_name]["mc"], **PROFILES[profile_name]["gen"], **LANG_TASKS}
    tasks = selected_tasks or list(limits)
    unknown = set(tasks) - set(limits)
    if unknown:
        raise ValueError(f"Tasks not configured: {', '.join(sorted(unknown))}")

    # Tasks with the same sample limit run together in one lm_eval call.
    groups = {}
    for t in tasks:
        groups.setdefault(limits[t], []).append(t)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    all_results = {}

    for i, (limit, group_tasks) in enumerate(groups.items()):
        out_dir = RESULTS_DIR / f"{slug(name)}_lm_eval_{i}"
        out_dir.mkdir(parents=True, exist_ok=True)
        # Remove old result files so an old run cannot be mistaken for this one.
        for old in out_dir.rglob("results_*.json"):
            old.unlink()

        cmd = [
            sys.executable, "-m", "lm_eval",
            "--model", "gguf",
            "--model_args", f"base_url={server_url.rstrip('/')},parallel=1",
            "--tasks", ",".join(group_tasks),
            "--num_fewshot", "0",
            "--batch_size", str(BATCH_SIZE),
            "--output_path", str(out_dir),
        ]
        if limit is not None:
            cmd += ["--limit", str(limit)]

        print(f"  Running lm_eval tasks: {', '.join(group_tasks)}")
        print(f"  Sample limit: {limit if limit is not None else 'full dataset'}")
        code = subprocess.run(cmd, check=False).returncode
        if code != 0:
            raise RuntimeError(f"lm_eval failed for {group_tasks}; exit code: {code}")

        # Find the newest result JSON that contains all our tasks.
        data = results_file = None
        for cand in sorted(out_dir.rglob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                d = json.loads(cand.read_text(encoding="utf-8"))
                if all(t in d.get("results", {}) for t in group_tasks):
                    data, results_file = d, cand
                    break
            except (OSError, json.JSONDecodeError, AttributeError):
                continue
        if data is None:
            raise RuntimeError(f"No valid lm_eval results JSON found under: {out_dir}")

        for t in group_tasks:
            all_results[t] = data["results"][t]
            metric = PREFERRED_METRIC.get(t, "acc,none")
            value = data["results"][t].get(metric)
            if isinstance(value, (int, float)):
                print(f"  {t}: {metric} = {value * 100:.2f}%")
            else:
                print(f"  {t}: completed; metric {metric} unavailable")
        print(f"  Raw output: {results_file}")

    return all_results

def worker_llama_cpp(model_path, name, profile_name, stages,
                     server_url, force=False, selected_tasks=None):
    model_path = Path(model_path).expanduser()
    if not model_path.is_file():
        raise FileNotFoundError(f"GGUF model not found: {model_path}")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = RESULTS_DIR / f"{slug(name)}.json"
    profile = PROFILES[profile_name]

    # Never mix results from different backends or model files.
    report = load_report(path, backend="llama_cpp", model=str(model_path), profile=profile_name)
    report.update(name=name, server_url=server_url, reasoning="off",
                  model_file_gb=round(model_path.stat().st_size / 1e9, 2))

    print(f"\n=== {name} | llama.cpp ===")
    print(f"Model: {model_path}")
    print(f"Server: {server_url}")

    # Only the stages that use the server need it running (ppl loads the model itself).
    if {"custom", "speed", "lm"} & set(stages):
        try:
            req = urllib.request.Request(server_url.rstrip("/") + "/health")
            with urllib.request.urlopen(req, timeout=10) as response:
                print(f"Server health: HTTP {response.status}")
        except Exception as e:
            raise RuntimeError(f"Cannot reach llama-server at {server_url}. Start it first.") from e
        preflight = llama_chat(server_url, "Reply with exactly OK.", max_tokens=64)
        print(f"Preflight response: {preflight['text']}")

    plan = [
        ("custom", "custom_tests", lambda: run_custom_llama(server_url)),
        ("ppl", "perplexity", lambda: run_ppl_llama(model_path, profile["ppl_max_chars"])),
        ("speed", "speed", lambda: run_speed_llama(server_url, profile["speed_repeats"])),
        ("lm", "lm_eval", lambda: run_lm_eval_gguf(server_url, profile_name, selected_tasks, name)),
    ]
    run_stages(path, report, plan, stages, force, selected_tasks or all_lm_tasks(profile))


# ==================================================
# 5. HUGGING FACE BACKEND
# ==================================================

def run_lm_eval(model, tok, profile, selected_tasks=None):
    import lm_eval
    from lm_eval.models.huggingface import HFLM

    lm = cast(Callable[..., Any], HFLM)(pretrained=model, tokenizer=tok, batch_size=LM_BATCH_SIZE)
    evaluate = cast(Callable[..., Any], lm_eval.simple_evaluate)

    # (tasks, use chat template). Only the generation task (ifeval) uses the template.
    groups = [(profile["mc"], False),
              (profile["gen"], bool(getattr(tok, "chat_template", None))),
              (LANG_TASKS, False)]
    if selected_tasks:
        selected = set(selected_tasks)
        missing = selected - {t for tasks, _ in groups for t in tasks}
        if missing:
            raise ValueError(f"Tasks not configured: {', '.join(sorted(missing))}")
        groups = [({k: v for k, v in tasks.items() if k in selected}, tpl)
                  for tasks, tpl in groups]

    out = {}
    for tasks, use_tpl in groups:
        for task, limit in tasks.items():
            t0 = time.time()
            try:
                res = evaluate(model=lm, tasks=[task], num_fewshot=0, limit=limit,
                               apply_chat_template=use_tpl, bootstrap_iters=0,
                               log_samples=False)
                if not res or "results" not in res:
                    raise RuntimeError("lm_eval returned no results.")
                out[task] = res["results"][task]
                print(f"  {task}: done in {time.time() - t0:.0f}s")
            except Exception as e:
                out[task] = {"error": str(e)[:300]}
                print(f"  {task}: FAILED ({str(e)[:120]})")
    return out

def run_custom(model, tok, torch):
    prompts, flag = [], True
    for _, text, _ in CUSTOM_TESTS:
        p, flag = build_prompt(tok, text)
        prompts.append(p)

    old_side = tok.padding_side
    tok.padding_side = "left"
    outputs = []
    for i in range(0, len(prompts), CUSTOM_BATCH):
        enc = tok(prompts[i:i + CUSTOM_BATCH], return_tensors="pt", padding=True,
                  add_special_tokens=flag).to(DEVICE)
        with torch.inference_mode():
            gen = model.generate(**enc, max_new_tokens=120, do_sample=False,
                                 pad_token_id=tok.pad_token_id)
        for row in gen[:, enc["input_ids"].shape[1]:]:
            outputs.append(tok.decode(row, skip_special_tokens=True).strip())
    tok.padding_side = old_side
    return score_custom(outputs)

def run_perplexity(model, tok, torch, max_chars):
    text = load_ppl_text(max_chars)
    ids = tok(text, return_tensors="pt", add_special_tokens=False)["input_ids"]
    max_pos = getattr(model.config, "max_position_embeddings", None) or PPL_CONTEXT
    ctx = min(PPL_CONTEXT, max_pos)
    stride = max(1, min(PPL_STRIDE, ctx // 2))

    total_nll, total_tokens, prev_end = 0.0, 0, 0
    seq_len = ids.shape[1]
    with torch.inference_mode():
        for begin in range(0, seq_len, stride):
            end = min(begin + ctx, seq_len)
            x = ids[:, begin:end].to(DEVICE)
            target_start = max(prev_end - begin, 1)
            if end - begin <= target_start:
                break
            labels = x.clone()
            labels[:, :target_start] = -100
            loss = model(input_ids=x, labels=labels).loss
            n = (labels[:, 1:] != -100).sum().item()
            if n > 0:
                total_nll += loss.item() * n
                total_tokens += n
            prev_end = end
            if end == seq_len:
                break

    if not math.isfinite(total_nll):
        raise RuntimeError("NaN/inf loss. Try dtype bfloat16 in MODEL_OPTS.")
    ppl = math.exp(total_nll / total_tokens)
    # Bits per byte is the fair number across different tokenizers.
    bpb = total_nll / math.log(2) / len(text.encode("utf-8"))
    return {"perplexity_per_token": ppl, "bits_per_byte": bpb,
            "tokens": total_tokens, "context": ctx, "stride": stride}

def measure_speed(model, tok, torch, input_ids, repeats):
    kw = dict(attention_mask=torch.ones_like(input_ids), do_sample=False,
              pad_token_id=tok.pad_token_id or tok.eos_token_id)
    with torch.inference_mode():
        for _ in range(WARMUP_RUNS):
            model.generate(input_ids, max_new_tokens=16, **kw)
        ttfts, rates = [], []
        for _ in range(repeats):
            sync(torch)
            t0 = time.perf_counter()
            model.generate(input_ids, max_new_tokens=1, min_new_tokens=1, **kw)
            sync(torch)
            ttft = time.perf_counter() - t0

            t0 = time.perf_counter()
            out = model.generate(input_ids, max_new_tokens=MAX_NEW_TOKENS,
                                 min_new_tokens=MAX_NEW_TOKENS, **kw)
            sync(torch)
            total = time.perf_counter() - t0
            n = out.shape[1] - input_ids.shape[1]
            rates.append((n - 1) / max(total - ttft, 1e-9))
            ttfts.append(ttft)
    return {"prompt_tokens": int(input_ids.shape[1]),
            "ttft_ms": statistics.mean(ttfts) * 1000,
            "estimated_decode_tokens_per_s": statistics.mean(rates)}

def run_speed(model, tok, torch, repeats):
    prompt, flag = build_prompt(tok, SPEED_PROMPT)
    short_ids = tok(prompt, return_tensors="pt", add_special_tokens=flag)["input_ids"].to(DEVICE)

    filler = "Neural networks learn by adjusting weights to reduce error. " * 400
    long_ids = tok(filler, return_tensors="pt", add_special_tokens=False)["input_ids"]
    long_ids = long_ids[:, :LONG_PROMPT_TOKENS].to(DEVICE)

    cuda = torch.cuda.is_available()
    if cuda:
        torch.cuda.reset_peak_memory_stats()
    res = {"short": measure_speed(model, tok, torch, short_ids, repeats),
           "long": measure_speed(model, tok, torch, long_ids, repeats)}
    if cuda:
        res["peak_memory_gb"] = torch.cuda.max_memory_allocated() / 1e9
    return res

def worker(model_id, profile_name, stages, selected_tasks=None, force=False):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    profile = PROFILES[profile_name]
    opts = MODEL_OPTS.get(model_id, {})
    dtype_name = opts.get("dtype", DEFAULT_DTYPE)
    if not isinstance(dtype_name, str):
        raise TypeError("Model dtype must be a string.")
    dtype = getattr(torch, dtype_name)
    trust = opts.get("trust_remote_code") is True

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = RESULTS_DIR / f"{slug(model_id)}.json"
    report = load_report(path, model=model_id, profile=profile_name)
    report["dtype"] = str(dtype)

    print(f"\n=== {model_id} ===")
    try:
        tok = AutoTokenizer.from_pretrained(model_id, trust_remote_code=trust)
        if tok.pad_token is None:
            tok.pad_token = tok.eos_token
        model = AutoModelForCausalLM.from_pretrained(model_id, dtype=dtype,
                                                     trust_remote_code=trust)
        model = cast(torch.nn.Module, model)
        torch.nn.Module.to(model, DEVICE)
        model.eval()
        report["params_millions"] = sum(p.numel() for p in model.parameters()) / 1e6
    except Exception as e:
        import traceback
        traceback.print_exc()
        report["errors"]["load"] = str(e)[:500]
        save_report(path, report)
        print("Load failed:", e)
        return

    plan = [
        ("custom", "custom_tests", lambda: run_custom(model, tok, torch)),
        ("ppl", "perplexity", lambda: run_perplexity(model, tok, torch, profile["ppl_max_chars"])),
        ("speed", "speed", lambda: run_speed(model, tok, torch, profile["speed_repeats"])),
        ("lm", "lm_eval", lambda: run_lm_eval(model, tok, profile, selected_tasks)),  # slowest, so last
    ]
    run_stages(path, report, plan, stages, force, selected_tasks or all_lm_tasks(profile))

    del model
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# ==================================================
# 6. SUMMARY + DRIVER
# ==================================================

def pick_metric(task, d):
    if not isinstance(d, dict) or "error" in d:
        return None
    key = PREFERRED_METRIC.get(task, "acc,none")
    if isinstance(d.get(key), (int, float)):
        return d[key] * 100
    for k, v in d.items():
        if isinstance(v, (int, float)) and "stderr" not in k:
            return v * 100
    return None

def summarize():
    def tok_s(d):
        return d.get("decode_tokens_per_s") or d.get("estimated_decode_tokens_per_s")

    rows = []
    for p in sorted(RESULTS_DIR.glob("*.json")):
        if p.name.startswith("summary"):
            continue
        try:
            r = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if "model" not in r:
            continue

        lm = r.get("lm_eval") or {}
        c, pp, sp = (r.get(k) or {} for k in ("custom_tests", "perplexity", "speed"))
        short, long = sp.get("short") or {}, sp.get("long") or {}

        rows.append({
            "model": r.get("name", r["model"]),
            "backend": r.get("backend", "hf"),
            "params_M": r.get("params_millions"),
            "model_file_gb": r.get("model_file_gb"),
            **{t: pick_metric(t, lm.get(t)) for t in ["boolq", "hellaswag"] + list(LANG_TASKS)},
            "rules_pct": c.get("rules_pct"),
            "lang_pct": c.get("lang_pct"),
            "ppl": pp.get("perplexity_per_token"),
            "bits_per_byte": pp.get("bits_per_byte"),
            "ttft_short_ms": short.get("ttft_ms"),
            "tok_s_short": tok_s(short),
            "prompt_tps_short": short.get("prompt_tokens_per_s"),
            "ttft_long_ms": long.get("ttft_ms"),
            "tok_s_long": tok_s(long),
            "prompt_tps_long": long.get("prompt_tokens_per_s"),
            "peak_gb": sp.get("peak_memory_gb"),
            "errors": ";".join(r.get("errors", {}).keys()),
        })

    if not rows:
        print("No results yet.")
        return

    cols = [
        "model", "backend", "params_M",
        "boolq", "hellaswag", "xnli_hi",
        "rules_pct", "lang_pct",
        "ppl", "bits_per_byte",
        "ttft_short_ms", "tok_s_short", "prompt_tps_short",
        "ttft_long_ms", "tok_s_long", "prompt_tps_long",
        "peak_gb", "errors", "model_file_gb",
    ]
    with open(RESULTS_DIR / "summary.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    def fmt(v):
        return "-" if v is None else (f"{v:.2f}" if isinstance(v, float) else str(v))

    lines = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    lines += ["| " + " | ".join(fmt(r[c]) for c in cols) + " |" for r in rows]
    (RESULTS_DIR / "summary.md").write_text("\n".join(lines), encoding="utf-8")

    print("\n".join(lines))
    print("\nSaved results/summary.csv and results/summary.md")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--worker", help="(internal) run one HF model")
    ap.add_argument("--backend", default=DEFAULT_BACKEND, choices=["hf", "llama_cpp"])
    ap.add_argument("--model", help="Model ID for HF or GGUF file path")
    ap.add_argument("--name", help="Short name used for the result file")
    ap.add_argument("--server-url", default=DEFAULT_SERVER_URL)
    ap.add_argument("--profile", default="quick", choices=list(PROFILES))
    ap.add_argument("--stages", default="custom,ppl,speed,lm")
    ap.add_argument("--only", help="only models whose id contains this text")
    ap.add_argument("--tasks", help="comma-separated LM evaluation tasks")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--summary", action="store_true")
    args = ap.parse_args()

    if args.summary:
        summarize()
        return

    stages = {s.strip() for s in args.stages.split(",") if s.strip()}
    selected_tasks = [t.strip() for t in args.tasks.split(",") if t.strip()] if args.tasks else None

    # GGUF / llama.cpp path.
    if args.backend == "llama_cpp":
        model_path = args.model or GGUF_MODEL
        worker_llama_cpp(
            model_path=model_path,
            name=args.name or args.worker or Path(model_path).stem,
            profile_name=args.profile,
            stages=stages,
            server_url=args.server_url,
            force=args.force,
            selected_tasks=selected_tasks,
        )
        return

    # One HF model (this is what each launched subprocess runs).
    if args.worker:
        worker(args.worker, args.profile, stages, selected_tasks, force=args.force)
        return

    # Launch one subprocess per model so GPU memory is freed after each one.
    models = [m for m in MODELS if not args.only or args.only.lower() in m.lower()]
    if not models:
        print("No matching models found.")
        return

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    for model_id in models:
        cmd = [sys.executable, str(Path(__file__).resolve()),
               "--worker", model_id,
               "--profile", args.profile,
               "--stages", ",".join(sorted(stages))]
        if selected_tasks:
            cmd += ["--tasks", ",".join(selected_tasks)]
        if args.force:
            cmd.append("--force")
        print(f"\nLaunching: {model_id}")
        subprocess.run(cmd, check=False)


if __name__ == "__main__":
    main()