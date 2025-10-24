import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_BACK_URL

function App() {
  const [teams, setTeams] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRoll, setSelectedRoll] = useState(null)

  // Fetch all teams from backend
  async function fetchTeams() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/teams`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTeams(data.teams || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  // Flatten teams into roll rows for table display
  const rollRows = useMemo(() => {
    const rows = []
    teams.forEach(team => {
      team.members?.forEach(rollNo => {
        rows.push({ rollNo, teamId: team._id, score: team.score })
      })
    })
    return rows
  }, [teams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rollRows
    return rollRows.filter(r => r.rollNo.toLowerCase().includes(q))
  }, [rollRows, query])

  function openModal(rollNo) {
    setSelectedRoll(rollNo)
  }

  function closeModal() {
    setSelectedRoll(null)
    fetchTeams() // Refetch all teams when modal closes
  }

  return (
    <div className="app-root">
      <h1>Roll Numbers & Scores</h1>

      <div className="search-row">
        <input
          aria-label="Search roll numbers"
          placeholder="Search roll number..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="search-input"
        />
        <div className="stats">Showing {filtered.length} / {rollRows.length}</div>
      </div>

      {loading && <p className="status-msg">Loading teams...</p>}
      {error && <p className="status-msg error">Error: {error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <table className="roll-table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Team ID</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={`${row.rollNo}-${idx}`}>
                  <td>{row.rollNo}</td>
                  <td className="team-id">{row.teamId}</td>
                  <td className="score">{row.score}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => openModal(row.rollNo)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="4" className="no-data">No roll numbers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedRoll && (
        <ScoreModal rollNo={selectedRoll} onClose={closeModal} />
      )}
    </div>
  )
}

function ScoreModal({ rollNo, onClose }) {
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('add')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const change = parseInt(amount, 10)
    if (Number.isNaN(change) || change <= 0) {
      setError('Please enter a valid positive number')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const endpoint = mode === 'add' ? '/score_add' : '/score_subtract'
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, change })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      // Success - close modal (parent will refetch)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Score</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="roll-label">Roll Number: <strong>{rollNo}</strong></p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                className="amount-input"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="1"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Operation</label>
              <div className="mode-select">
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="add"
                    checked={mode === 'add'}
                    onChange={() => setMode('add')}
                  /> Add
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="sub"
                    checked={mode === 'sub'}
                    onChange={() => setMode('sub')}
                  /> Subtract
                </label>
              </div>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="apply-btn"
                disabled={submitting}
              >
                {submitting ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
