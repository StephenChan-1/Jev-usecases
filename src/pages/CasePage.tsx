import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCase } from '../api.ts'

export function CasePage() {
  const { id = '' } = useParams()

  useEffect(() => {
    void getCase(id).then((record) => {
      window.location.assign(record.url)
    })
  }, [id])

  return (
    <p className="kicker">
      Opening X… <Link to="/">Stay on the feed</Link>
    </p>
  )
}
