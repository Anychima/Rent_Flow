# Contributing to RentFlow AI

First off, thank you for considering contributing to RentFlow AI! It's people like you that make RentFlow AI such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by respect, professionalism, and collaboration. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected
- **Include screenshots** if relevant
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List examples** of how it would be used

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the existing code style** and conventions
3. **Write clear commit messages**
4. **Include tests** for new features
5. **Update documentation** as needed
6. **Ensure all tests pass** before submitting

#### Pull Request Process

1. Fork the repo and create your branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. Make your changes and commit:
   ```bash
   git commit -m "Add some feature"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```

4. Open a Pull Request with a clear title and description

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Anychima/Rent_Flow.git
   cd Rent_Flow
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit .env files with your configuration
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Avoid using `any` type when possible
- Use meaningful variable and function names

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Follow existing code patterns

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests liberally

Examples:
```
Add payment processing feature
Fix authentication bug in login flow
Update README with new setup instructions
```

## Project Structure

```
Rent_Flow/
├── frontend/              # React frontend
├── backend/               # Express backend
├── contracts/             # Smart contracts
├── database/              # Database schemas
├── scripts/               # Utility scripts
└── docs/                  # Documentation
```

### Frontend Development

- Components should be functional with hooks
- Use TypeScript interfaces for props
- Keep components small and focused
- Use Tailwind CSS for styling

### Backend Development

- Follow RESTful API conventions
- Use async/await for asynchronous operations
- Implement proper error handling
- Add validation for all inputs

### Smart Contract Development

- Follow Solidity best practices
- Write comprehensive tests
- Document all public functions
- Use OpenZeppelin libraries when appropriate

## Testing

### Running Tests

```bash
# All tests
npm test

# Backend tests
cd backend && npm test

# Contract tests
npx hardhat test
```

### Writing Tests

- Write unit tests for new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

## Documentation

- Update README.md for significant changes
- Add JSDoc comments for functions
- Update API documentation for endpoint changes
- Create/update guides for new features

## Questions?

Feel free to open an issue with the tag `question` or contact:
- **Email**: olumba.chima.anya@ut.ee
- **GitHub**: [@Anychima](https://github.com/Anychima)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to RentFlow AI! 🎉**
