# Privacy Toolkit

A collection of enterprise-grade privacy tools that run entirely in your browser. No data is ever sent to a server.

## Features

- **PDF Redactor**: Permanently redact sensitive information from PDFs with a visual editor.
- **Image Compression**: Compress images locally without quality loss.
- **Steganography**: Hide secret messages within images.
- **Metadata Stripper**: Remove potentially revealing metadata from files.
- **File Encryption**: Securely encrypt files with AES-256.

## Getting Started

### Prerequisites

- Node.js 18.17 or later

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/privacy-toolkit.git
   cd privacy-toolkit
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `.next` directory.

## Technologies Used

- **Framework**: [Next.js 14](https://nextjs.org/)
- **PDF Processing**: `pdf-lib`, `pdfjs-dist`
- **Styling**: CSS Modules
- **Language**: TypeScript

## License

MIT
