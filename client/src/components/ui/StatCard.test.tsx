import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Pending Consent" value="2" />)
    expect(screen.getByText('Pending Consent')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders an optional sub-caption', () => {
    render(<StatCard label="Medical Records" value="4" sub="total records" />)
    expect(screen.getByText('total records')).toBeInTheDocument()
  })

  it('omits the sub-caption when none is given', () => {
    render(<StatCard label="Medical Records" value="4" />)
    expect(screen.queryByText('total records')).not.toBeInTheDocument()
  })

  it('renders a value that is itself a React node, e.g. a badge', () => {
    render(<StatCard label="Passport Status" value={<span data-testid="status-badge">Active</span>} />)
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Active')
  })
})
