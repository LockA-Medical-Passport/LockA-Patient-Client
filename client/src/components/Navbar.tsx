import { useState, type ComponentType } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LockaLogo } from './LockaLogo'
import { ActivityIcon, ConsentIcon, DashboardIcon, PassportIcon, RecordsIcon, SummaryIcon, type NavIconProps } from './NavIcons'
import { WalletButton } from './wallet/WalletButton'

interface NavItem {
  to: string
  label: string
  end?: boolean
  Icon: ComponentType<NavIconProps>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true, Icon: DashboardIcon },
  { to: '/passport', label: 'Passport', Icon: PassportIcon },
  { to: '/records', label: 'Records', Icon: RecordsIcon },
  { to: '/consent', label: 'Consent', Icon: ConsentIcon },
  { to: '/activity', label: 'Activity', Icon: ActivityIcon },
  { to: '/summary', label: 'Summary', Icon: SummaryIcon },
]

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return `nav-link inline-flex items-center ${isActive ? 'active' : ''}`
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="glass sticky top-0 z-40 border-b border-blue-900/30">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center gap-3 flex-shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <LockaLogo size={34} />
            <div className="leading-none">
              <div className="text-sm font-bold tracking-tight">
                <span className="text-white">Lock</span>
                <span className="gradient-text">A</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
                Medical Passport
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {NAV_ITEMS.map(({ to, label, end, Icon }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClassName}>
                <Icon className="w-4 h-4 mr-1.5 opacity-70" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <WalletButton />
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="lg:hidden btn-secondary p-2 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div data-testid="mobile-menu" className="lg:hidden border-t border-blue-900/30 py-3">
            {NAV_ITEMS.map(({ to, label, end, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `nav-link w-full text-left mb-1 flex items-center ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="w-4 h-4 mr-2 opacity-70" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
