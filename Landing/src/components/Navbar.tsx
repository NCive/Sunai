import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { content } from '../content';
import { VoiceAssistantButton } from './VoiceAssistantButton';

interface NavbarProps {
  isOnline: boolean | null;
  onOpenOfflineModal: () => void;
}

export function Navbar({ isOnline, onOpenOfflineModal }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Blur glass background if scrolled > 20px
      setIsScrolled(currentScrollY > 20);

      // Hide navbar when scrolling down, reveal when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 120) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);

      // Active section detection
      const sections = content.navItems.map((item) => item.href.substring(1));
      let currentActive = '';
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            currentActive = section;
            break;
          }
        }
      }
      setActiveSection(currentActive);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${
        isScrolled
          ? 'bg-[#02030B]/80 backdrop-blur-md border-b border-white/10 py-3 shadow-lg'
          : 'bg-transparent py-5'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" aria-label="Main navigation">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2">
          <a
            href="#"
            className="flex items-center gap-2.5 text-white font-heading font-bold text-xl tracking-wider group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded-lg px-1"
          >
            <span className="w-6 h-6 rounded-full border border-white/40 flex items-center justify-center group-hover:border-accent-blue transition-colors">
              <span className="w-2 h-2 rounded-full bg-accent-blue group-hover:scale-125 transition-transform" />
            </span>
            <span>{content.hero.brand}</span>
          </a>
          <span className="hidden xl:inline text-[11px] text-zinc-400 font-mono tracking-tight pl-2 border-l border-zinc-800">
            {content.hero.brandMeaning}
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-5 lg:gap-7">
          {content.navItems.map((item) => {
            const isActive = activeSection === item.href.substring(1);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`text-xs font-medium transition-colors hover:text-white ${
                  isActive ? 'text-accent-blue' : 'text-zinc-400'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Actions: Status & Primary Button */}
        <div className="flex items-center gap-3">
          <VoiceAssistantButton
            variant="navbar"
            isOnline={isOnline}
            onOfflineClick={onOpenOfflineModal}
            showStatusDot={true}
          />

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-card border-b border-white/10 bg-[#0A1024]/95 px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            {content.navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-mono">
              {isOnline ? content.assistantStatus.labels.online : content.assistantStatus.labels.offline}
            </span>
            <VoiceAssistantButton
              variant="navbar"
              isOnline={isOnline}
              onOfflineClick={() => {
                setMobileMenuOpen(false);
                onOpenOfflineModal();
              }}
              showStatusDot={false}
            />
          </div>
        </div>
      )}
    </header>
  );
}

