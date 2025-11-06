# Method Icon Resizer

A Figma plugin that automatically creates icon component sets with multiple size variants and optimized stroke weights.

## Features

- **Automatic Size Variants**: Creates 6 size variants (16×16, 20×20, 24×24, 32×32, 40×40, 48×48px)
- **Optimized Stroke Weights**: Automatically applies appropriate stroke weights for each size (1.5px to 4px)
- **Component Sets**: Generates proper Figma component sets with variant properties
- **Smart Positioning**: Horizontally spaces components with 40px gaps in a 412×80px frame
- **Input Validation**: Validates icon names to ensure compatibility with Figma naming conventions

## How to Use

### Single Icon Mode
1. Select a frame containing your icon (must have a group with vector objects inside)
2. Enter a name for your component set
3. Click "Create component set"
4. The plugin generates all 6 size variants and combines them into a component set

### Batch Mode (Coming Soon)
- Select multiple frames
- Switch to Batch mode
- Component sets are created for each frame using the frame's name as the icon name

## Requirements

- Figma desktop app
- Frame containing a group with vector object(s)

## Installation

1. Open Figma
2. Plugins → Manage plugins
3. Search for "Method Icon Resizer" or install from community

## Technical Details

- **API Version**: 1.0.0
- **Built with**: TypeScript, esbuild
- **Vector Processing**: Uses Figma's flatten API to merge vectors
- **Component System**: Leverages Figma's combineAsVariants for component sets

## Naming Rules

Icon names can contain:
- Letters (a-z, A-Z)
- Numbers (0-9)
- Spaces
- Hyphens (-)
- Underscores (_)

## Future Features

- Batch creation mode for multiple icons
- Custom size configurations
- Custom stroke weight mappings
