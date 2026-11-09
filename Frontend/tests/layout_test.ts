/**
 * Sunai Layout Verification Test
 * Verifies layout geometry, breakpoints, CSS grid dimensions, zero-overlap constraints,
 * and responsive states.
 */

import { CONFIG } from '../src/config.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

console.log('--- RUNNING SUNAI LAYOUT & BREAKPOINT VERIFICATION ---');

// 1. Validate Config constants (No magic numbers)
console.log('\nTest 1: Validating Layout Config Constants in config.ts...');
assert(CONFIG.layout.headerHeightPx === 56, 'headerHeightPx must be 56');
assert(CONFIG.layout.sidebarWidthPx === 380, 'sidebarWidthPx must be 380');
assert(CONFIG.layout.sidebarMinWidthPx === 340, 'sidebarMinWidthPx must be 340');
assert(CONFIG.layout.sidebarMaxWidthPx === 420, 'sidebarMaxWidthPx must be 420');
assert(CONFIG.layout.timelineHeightPx === 120, 'timelineHeightPx must be 120');
assert(CONFIG.layout.timelineCollapsedHeightPx === 34, 'timelineCollapsedHeightPx must be 34');
assert(CONFIG.layout.breakpointMobileWidthPx === 900, 'breakpointMobileWidthPx must be 900');
assert(CONFIG.layout.breakpointAutoCollapseHeightPx === 600, 'breakpointAutoCollapseHeightPx must be 600');
console.log('✓ Test 1 Passed: All layout dimensions and breakpoints correctly defined in config.ts');

// 2. Grid Geometry & Breakpoints Simulation
console.log('\nTest 2: Validating Layout Geometry across Viewport Breakpoints...');

interface ViewportTestCase {
  name: string;
  width: number;
  height: number;
  expectedDrawer: boolean;
  expectedTimelineCollapsed: boolean;
  minStageHeight: number;
}

const testCases: ViewportTestCase[] = [
  {
    name: 'Full HD Desktop (1920x1080)',
    width: 1920,
    height: 1080,
    expectedDrawer: false,
    expectedTimelineCollapsed: false,
    minStageHeight: 800,
  },
  {
    name: 'Standard Laptop (1366x768)',
    width: 1366,
    height: 768,
    expectedDrawer: false,
    expectedTimelineCollapsed: false,
    minStageHeight: 550,
  },
  {
    name: 'Short Viewport Height (< 600px, e.g. 1280x540)',
    width: 1280,
    height: 540,
    expectedDrawer: false,
    expectedTimelineCollapsed: true, // auto-collapse
    minStageHeight: 400,
  },
  {
    name: 'Mobile / Tablet Width (< 900px, e.g. 768x1024)',
    width: 768,
    height: 1024,
    expectedDrawer: true, // drawer mode
    expectedTimelineCollapsed: false,
    minStageHeight: 700,
  },
  {
    name: 'Small Mobile (< 900px width & < 600px height, e.g. 414x520)',
    width: 414,
    height: 520,
    expectedDrawer: true,
    expectedTimelineCollapsed: true,
    minStageHeight: 400,
  },
];

for (const tc of testCases) {
  const isMobileWidth = tc.width < CONFIG.layout.breakpointMobileWidthPx;
  const isAutoCollapseHeight = tc.height < CONFIG.layout.breakpointAutoCollapseHeightPx;

  assert(isMobileWidth === tc.expectedDrawer, `${tc.name}: expectedDrawer should be ${tc.expectedDrawer}`);
  assert(isAutoCollapseHeight === tc.expectedTimelineCollapsed, `${tc.name}: expectedTimelineCollapsed should be ${tc.expectedTimelineCollapsed}`);

  const sidebarWidth = isMobileWidth
    ? 0 // Drawer overlay outside grid
    : Math.max(CONFIG.layout.sidebarMinWidthPx, Math.min(CONFIG.layout.sidebarMaxWidthPx, tc.width * 0.24));

  const timelineHeight = isAutoCollapseHeight
    ? CONFIG.layout.timelineCollapsedHeightPx
    : CONFIG.layout.timelineHeightPx;

  const stageWidth = tc.width - sidebarWidth;
  const stageHeight = tc.height - CONFIG.layout.headerHeightPx - timelineHeight;

  assert(stageHeight >= tc.minStageHeight, `${tc.name}: stageHeight (${stageHeight}px) should exceed min ${tc.minStageHeight}px`);

  // Zero-overlap validation:
  // Sphere center is at (stageWidth / 2, stageHeight / 2).
  // Captions sit at bottom: 16px, max height: min(140px, 30vh) -> top of captions is at (stageHeight - 16 - maxCaptionHeight).
  // Top badge sits at top: 20px, max height: ~50px -> bottom of badge is at 70px.
  const stageCenterY = stageHeight / 2;
  const captionsMaxHeight = Math.min(140, tc.height * 0.30);
  const captionsTopY = stageHeight - 16 - captionsMaxHeight;
  const badgeBottomY = 70;

  assert(
    captionsTopY > stageCenterY + 40,
    `${tc.name}: Captions top (${captionsTopY}px) must sit well below stage center (${stageCenterY}px) to prevent sphere overlap`
  );
  assert(
    badgeBottomY < stageCenterY - 40,
    `${tc.name}: Badge bottom (${badgeBottomY}px) must sit well above stage center (${stageCenterY}px) to prevent sphere overlap`
  );

  console.log(
    `  ✓ ${tc.name}: Stage ${stageWidth}x${stageHeight}px | Timeline: ${timelineHeight}px | Drawer: ${isMobileWidth ? 'YES' : 'NO'} | Sphere Center Clear: YES`
  );
}

// 3. Validate CSS Grid template areas specification
console.log('\nTest 3: Validating CSS Grid template areas layout...');
const desktopGridRows = `${CONFIG.layout.headerHeightPx}px 1fr ${CONFIG.layout.timelineHeightPx}px`;
const desktopGridCols = `1fr clamp(${CONFIG.layout.sidebarMinWidthPx}px, 24vw, ${CONFIG.layout.sidebarMaxWidthPx}px)`;
assert(desktopGridRows === '56px 1fr 120px', 'Desktop grid rows must be 56px 1fr 120px');
assert(desktopGridCols === '1fr clamp(340px, 24vw, 420px)', 'Desktop grid columns must clamp between 340px and 420px');
console.log(`  ✓ Desktop Grid Rows: ${desktopGridRows}`);
console.log(`  ✓ Desktop Grid Columns: ${desktopGridCols}`);

console.log('\n==================================================');
console.log('ALL SUNAI LAYOUT & BREAKPOINT TESTS PASSED!');
console.log('==================================================');
