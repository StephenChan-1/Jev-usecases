import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="shell">
      <header className="top">
        <Link to="/" className="mark">
          Jev use cases<span>.</span>
        </Link>
        <p>
          Paste an X link. Jev names the build. The feed is real TypeSafe Jev
          cases from X — what you can actually ship, and who to follow.
        </p>
      </header>
      <main className="stage">
        <Outlet />
      </main>
      <footer className="foot">
        <p>
          Not affiliated with TypeSafe AI.
          <a href="https://x.com/withstephen1" target="_blank" rel="noreferrer">
            Drop me a follow on X if you like this → @withstephen1
          </a>
        </p>
      </footer>
    </div>
  )
}
