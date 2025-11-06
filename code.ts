// Map sizes to their corresponding stroke weights
const SIZES_AND_WEIGHTS: { [key: number]: number } = {
  16: 1.5,
  20: 2,
  24: 2.5,
  32: 3,
  40: 3.5,
  48: 4
};

const SPACING = 40;

// Listen for messages from the UI
figma.ui.onmessage = async (msg: any) => {
  if (msg.type === 'create-components') {
    try {
      const mode = msg.mode || 'single';

      // Check if something is selected
      if (figma.currentPage.selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Please select a frame first'
        });
        return;
      }

      if (mode === 'single') {
        // Single mode: use provided icon name
        const iconName = msg.iconName;
        const selectedNode = figma.currentPage.selection[0];

        // Check if selection is a valid node type that can be cloned
        if (!('clone' in selectedNode)) {
          figma.ui.postMessage({
            type: 'error',
            message: 'Please select a valid vector or group object'
          });
          return;
        }

        await createComponentSet(selectedNode, iconName);
        figma.ui.postMessage({
          type: 'success',
          message: 'Component set created successfully!'
        });
      } else if (mode === 'batch') {
        // Batch mode: use frame names as icon names
        const selectedNodes = figma.currentPage.selection;

        // Validate at least 2 frames selected
        if (selectedNodes.length < 2) {
          figma.ui.postMessage({
            type: 'error',
            message: 'Batch mode requires 2 or more frames selected'
          });
          return;
        }

        // Process each frame
        const results = await processBatch(selectedNodes);

        // Send summary message
        figma.ui.postMessage({
          type: 'success',
          message: results.message
        });
      }
    } catch (error) {
      figma.ui.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create component set'
      });
    }
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

/**
 * Batch process multiple frames
 */
async function processBatch(selectedNodes: readonly BaseNode[]): Promise<{ message: string }> {
  const validName = /^[a-zA-Z0-9_ -]+$/;
  const successes: string[] = [];
  const failures: { name: string; reason: string }[] = [];

  let currentYPos = 0;
  const firstNode = selectedNodes[0] as any;
  let yStartPos = firstNode.y;
  // Calculate X position based on first frame (all batch sets align to this)
  const xPosition = firstNode.x + firstNode.width + 40;

  for (const node of selectedNodes) {
    const nodeName = (node as any).name || 'Unnamed';

    try {
      // Validate the frame name
      if (!validName.test(nodeName)) {
        failures.push({
          name: nodeName,
          reason: 'invalid characters in name'
        });
        continue;
      }

      // Check if node is valid
      if (!('clone' in node)) {
        failures.push({
          name: nodeName,
          reason: 'not a valid frame'
        });
        continue;
      }

      // Create component set with calculated Y position for vertical stacking
      // and fixed X position for left alignment
      const yPosition = yStartPos + currentYPos;
      await createComponentSet(node, nodeName, yPosition, xPosition, true);

      successes.push(nodeName);

      // Update Y position for next component set (height 80px + 80px spacing)
      currentYPos += 80 + 80;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      failures.push({
        name: nodeName,
        reason: reason
      });
    }
  }

  // Build summary message
  let message = '';
  if (successes.length > 0) {
    message = `Created ${successes.length} component set${successes.length !== 1 ? 's' : ''}`;
  }

  if (failures.length > 0) {
    if (message) {
      message += `. ${failures.length} failed`;
    } else {
      message = `Failed to create component sets`;
    }

    // Add first failure detail if any
    if (failures.length > 0) {
      message += `: ${failures[0].name} (${failures[0].reason})`;
    }
  }

  return { message };
}

async function createComponentSet(sourceNode: BaseNode, iconName: string, yPosition?: number, xPosition?: number, isBatch: boolean = false): Promise<void> {
  // Step 1: Create a working frame (flatten, scale, ungroup)
  const workingFrame = sourceNode.clone();

  // Find the group inside the frame
  if (!('children' in workingFrame)) {
    throw new Error('Selected node must be a frame');
  }

  const children = (workingFrame as any).children;
  if (!Array.isArray(children) || children.length === 0) {
    throw new Error('Frame must have children');
  }

  // Get the first child (should be the group)
  const firstChild = children[0];
  if (firstChild.type !== 'GROUP') {
    throw new Error('First child of frame must be a GROUP');
  }

  // Get all vector children from the group
  const groupChildren = (firstChild as any).children;
  if (!Array.isArray(groupChildren) || groupChildren.length === 0) {
    throw new Error('Group must contain vector objects');
  }

  const vectors: BaseNode[] = [];
  for (const child of groupChildren) {
    if (child && child.type === 'VECTOR') {
      vectors.push(child);
    }
  }

  if (vectors.length === 0) {
    throw new Error('Group must contain at least one VECTOR');
  }

  // Flatten all vectors into one
  const flattenedVector = figma.flatten(vectors);

  // Rename the flattened vector to "Icon"
  flattenedVector.name = 'Icon';

  // Capture the original icon dimensions
  const originalWidth = (flattenedVector as any).width;
  const originalHeight = (flattenedVector as any).height;

  // Ungroup the group - this moves the flattened vector out and removes the group
  figma.ungroup(firstChild);

  // Step 2: Create 6 size variants based on icon size
  const components: ComponentNode[] = [];

  // For batch mode, use the provided xPosition for left alignment
  // For single mode, calculate position based on the selected frame
  const startX = xPosition !== undefined ? xPosition : (sourceNode as any).x + (sourceNode as any).width + 40;
  let xPos = startX;
  const frameYPos = yPosition !== undefined ? yPosition : (sourceNode as any).y;

  for (const [size, strokeWeight] of Object.entries(SIZES_AND_WEIGHTS)) {
    const sizeNum = parseInt(size);

    // Clone the original flattened vector
    const iconClone = flattenedVector.clone();

    // Calculate scale factor to reach target size from original dimensions
    const maxOriginalDim = Math.max(originalWidth, originalHeight);
    const scaleFactor = sizeNum / maxOriginalDim;

    // Resize the icon to target size (before applying 90% scaling)
    iconClone.resize(originalWidth * scaleFactor, originalHeight * scaleFactor);

    // Now apply 90% scaling to prevent stroke cutoff
    const scaledWidth = (iconClone as any).width;
    const scaledHeight = (iconClone as any).height;
    const scaledSize90Width = scaledWidth * 0.90;
    const scaledSize90Height = scaledHeight * 0.90;

    // Calculate centering offset for the 90% scaling
    const offsetXFor90 = (scaledWidth - scaledSize90Width) / 2;
    const offsetYFor90 = (scaledHeight - scaledSize90Height) / 2;

    // Apply the 90% scaling
    iconClone.resize(scaledSize90Width, scaledSize90Height);
    (iconClone as any).x += offsetXFor90;
    (iconClone as any).y += offsetYFor90;

    // Apply stroke weight
    applyStrokeWeightRecursive(iconClone, strokeWeight);

    // Rename the icon
    iconClone.name = 'Icon';

    // Create a frame for this size variant
    const frame = figma.createFrame();
    frame.resize(sizeNum, sizeNum);
    // Remove the default white fill
    frame.fills = [];
    frame.appendChild(iconClone);

    // Center the icon in the frame
    const finalWidth = (iconClone as any).width;
    const finalHeight = (iconClone as any).height;
    const offsetX = (sizeNum - finalWidth) / 2;
    const offsetY = (sizeNum - finalHeight) / 2;
    iconClone.x = offsetX;
    iconClone.y = offsetY;

    // Name the frame with the size property
    frame.name = `Size=${sizeNum}`;

    // Position the frame
    frame.x = xPos;
    frame.y = frameYPos;
    xPos += frame.width + SPACING;

    // Create component from the frame
    const component = figma.createComponentFromNode(frame);
    components.push(component);
  }

  // Step 3: Combine as variants
  if (components.length > 1) {
    const componentSet = figma.combineAsVariants(components, figma.currentPage, 0) as ComponentSetNode;

    // Set the component set name to the icon name
    componentSet.name = iconName;

    // Resize the component set frame to specific dimensions
    componentSet.resize(412, 80);

    // Center align the components within the frame
    // Calculate total width of all components with spacing
    let totalComponentWidth = 0;
    const componentSetChildren = (componentSet as any).children;
    if (componentSetChildren && Array.isArray(componentSetChildren)) {
      for (let i = 0; i < componentSetChildren.length; i++) {
        const child = componentSetChildren[i];
        totalComponentWidth += (child as any).width;
        // Add spacing between components (not after the last one)
        if (i < componentSetChildren.length - 1) {
          totalComponentWidth += SPACING;
        }
      }

      // Calculate centering offsets
      const frameWidth = 412;
      const frameHeight = 80;
      const horizontalOffset = (frameWidth - totalComponentWidth) / 2;

      // Reposition each component to be centered
      let xPos = horizontalOffset;
      for (const child of componentSetChildren) {
        const childAny = child as any;
        // Center each component individually based on its own height
        const verticalOffset = (frameHeight - childAny.height) / 2;
        childAny.x = xPos;
        childAny.y = verticalOffset;
        xPos += childAny.width + SPACING;
      }
    }

    // Apply the component set styling (dashed border, padding, etc.)
    try {
      const componentSetAny = componentSet as any;

      // Add a dashed stroke to match Figma's component set appearance
      const stroke: Paint = {
        type: 'SOLID',
        color: { r: 0.59, g: 0.28, b: 1.0 }, // 9747FF in RGB
        opacity: 1
      };

      if ('strokes' in componentSetAny) {
        componentSetAny.strokes = [stroke];
      }

      if ('strokeWeight' in componentSetAny) {
        componentSetAny.strokeWeight = 1;
      }

      if ('strokeDashPattern' in componentSetAny) {
        componentSetAny.strokeDashPattern = [10, 5]; // Dash 10, Gap 5
      }

      if ('strokeAlign' in componentSetAny) {
        componentSetAny.strokeAlign = 'INSIDE';
      }

      // Add 16px padding around the components
      if ('paddingLeft' in componentSetAny) {
        componentSetAny.paddingLeft = 16;
      }
      if ('paddingRight' in componentSetAny) {
        componentSetAny.paddingRight = 16;
      }
      if ('paddingTop' in componentSetAny) {
        componentSetAny.paddingTop = 16;
      }
      if ('paddingBottom' in componentSetAny) {
        componentSetAny.paddingBottom = 16;
      }
    } catch (e) {
      // If we can't style the component set, that's okay - it still works
      // The styling is just visual preference
    }

    // Delete the working frame clone (no longer needed)
    if (workingFrame && 'remove' in workingFrame) {
      workingFrame.remove();
    }

    // Set constraints to Center/Center on all component frames and their icons
    const finalComponentChildren = (componentSet as any).children;
    if (finalComponentChildren && Array.isArray(finalComponentChildren)) {
      for (const component of finalComponentChildren) {
        // Set frame constraints to Center/Center
        if ('constraints' in component) {
          (component as any).constraints = {
            horizontal: 'CENTER',
            vertical: 'CENTER'
          };
        }

        // Set Icon vector constraints to Center/Center
        const componentChildren = (component as any).children;
        if (componentChildren && Array.isArray(componentChildren)) {
          for (const child of componentChildren) {
            if (child && child.name === 'Icon' && 'constraints' in child) {
              (child as any).constraints = {
                horizontal: 'CENTER',
                vertical: 'CENTER'
              };
            }
          }
        }
      }
    }

    // Zoom to show the component set
    figma.viewport.scrollAndZoomIntoView([componentSet]);
  }
}

/**
 * Recursively applies stroke weight to all vectors in a node
 */
function applyStrokeWeightRecursive(node: BaseNode, weight: number): void {
  if ('strokeWeight' in node) {
    (node as any).strokeWeight = weight;
  }

  if ('children' in node) {
    const children = (node as any).children;
    if (children && Array.isArray(children)) {
      children.forEach((child: BaseNode) => {
        applyStrokeWeightRecursive(child, weight);
      });
    }
  }
}

// Show the UI
figma.showUI(__html__, { width: 400, height: 500 });
