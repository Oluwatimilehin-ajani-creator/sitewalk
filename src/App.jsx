import { useState } from 'react'
import InspectPage from './InspectPage'
import DashboardPage from './DashboardPage'
import ActionsPage from './ActionsPage'

const TABS = [
  ['inspect', 'Inspect'],
  ['dashboard', 'Dashboard'],
  ['actions', 'Actions'],
]

function App() {
  const [tab, setTab] = useState('inspect')

  return (
    <>
      <header className="topbar">
        <strong className="brand">SiteWalk</strong>
        <nav className="tabs">
          {TABS.map(([key, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* The inspection stays loaded while hidden, so switching tabs never loses your answers */}
      <div hidden={tab !== 'inspect'}>
        <InspectPage />
      </div>
      {tab === 'dashboard' && <DashboardPage onOpenActions={() => setTab('actions')} />}
      {tab === 'actions' && <ActionsPage />}
    </>
  )
}

export default App