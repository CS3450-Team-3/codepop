import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputField } from '../components/inputField'

describe('InputField', () => {
  it('renders with label and input', () => {
    render(<InputField label="Test Label" id="test-input" />)

    const label = screen.getByText('Test Label')
    const input = screen.getByRole('textbox', { name: /test label/i })

    expect(label).toBeInTheDocument()
    expect(input).toBeInTheDocument()
  })

  it('passes through input props', () => {
    render(
      <InputField
        label="Email"
        id="email"
        type="email"
        placeholder="Enter your email"
        value="test@example.com"
      />
    )

    const input = screen.getByRole('textbox', { name: /email/i })
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('placeholder', 'Enter your email')
    expect(input).toHaveValue('test@example.com')
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<InputField label="Name" id="name" />)

    const input = screen.getByRole('textbox', { name: /name/i })
    await user.type(input, 'John Doe')

    expect(input).toHaveValue('John Doe')
  })
})