import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { CasePage } from './pages/CasePage.tsx'
import { HomePage } from './pages/HomePage.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'drop', element: <HomePage /> },
      { path: 'c/:id', element: <CasePage /> },
      { path: 'cases', element: <Navigate to="/" replace /> },
      { path: 'contribute', element: <Navigate to="/drop" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
