import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Welcome to StreamVault')
  })

  it('renders the feature cards', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Live Streaming')).toBeInTheDocument()
    expect(screen.getByText('Video on Demand')).toBeInTheDocument()
    expect(screen.getByText('AI Enhancement')).toBeInTheDocument()
  })

  it('renders the call-to-action buttons', () => {
    render(<HomePage />)
    
    expect(screen.getByRole('button', { name: /start streaming/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument()
  })
})