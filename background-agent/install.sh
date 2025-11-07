#!/bin/bash

# Mood Spark Background Agent - Installation Script

set -e

echo "🚀 Installing Mood Spark Background Agent..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version $NODE_VERSION detected. Please upgrade to Node.js 16+."
    exit 1
fi

echo "✅ Node.js version $(node --version) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Platform-specific setup
case "$(uname -s)" in
    Darwin*)
        echo "🍎 macOS detected"
        echo "⚠️  You may need to grant accessibility permissions when the agent starts"
        echo "   Go to: System Preferences > Security & Privacy > Privacy > Accessibility"
        ;;
    Linux*)
        echo "🐧 Linux detected"
        if command -v apt-get &> /dev/null; then
            echo "📋 Installing X11 development headers..."
            sudo apt-get update
            sudo apt-get install -y libx11-dev libxtst-dev libxrandr-dev
        elif command -v yum &> /dev/null; then
            echo "📋 Installing X11 development headers..."
            sudo yum install -y libX11-devel libXtst-devel libXrandr-devel
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo "🪟 Windows detected"
        echo "⚠️  You may need to run as Administrator for system monitoring"
        ;;
esac

# Check if Mood Spark API is running
echo "🔍 Checking Mood Spark API..."
if curl -s http://localhost:3000/api/auth/me > /dev/null 2>&1; then
    echo "✅ Mood Spark API is accessible at http://localhost:3000"
else
    echo "⚠️  Mood Spark API not detected at http://localhost:3000"
    echo "   Make sure your Mood Spark backend is running before starting the agent"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Start your Mood Spark backend: cd .. && npm run dev"
echo "   2. Start the background agent: npm start"
echo "   3. Grant system permissions when prompted"
echo ""
echo "📚 See README.md for detailed configuration options"