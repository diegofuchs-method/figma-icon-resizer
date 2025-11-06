"use strict";
(() => {
  // code.ts
  var SIZES_AND_WEIGHTS = {
    16: 1.5,
    20: 2,
    24: 2.5,
    32: 3,
    40: 3.5,
    48: 4
  };
  var SPACING = 40;
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "create-components") {
      try {
        const iconName = msg.iconName;
        if (figma.currentPage.selection.length === 0) {
          figma.ui.postMessage({
            type: "error",
            message: "Please select a vector object first"
          });
          return;
        }
        const selectedNode = figma.currentPage.selection[0];
        if (!("clone" in selectedNode)) {
          figma.ui.postMessage({
            type: "error",
            message: "Please select a valid vector or group object"
          });
          return;
        }
        await createComponentSet(selectedNode, iconName);
        figma.ui.postMessage({
          type: "success",
          message: "Component set created successfully!"
        });
      } catch (error) {
        figma.ui.postMessage({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to create component set"
        });
      }
    }
    if (msg.type === "close") {
      figma.closePlugin();
    }
  };
  async function createComponentSet(sourceNode, iconName) {
    const workingFrame = sourceNode.clone();
    if (!("children" in workingFrame)) {
      throw new Error("Selected node must be a frame");
    }
    const children = workingFrame.children;
    if (!Array.isArray(children) || children.length === 0) {
      throw new Error("Frame must have children");
    }
    const firstChild = children[0];
    if (firstChild.type !== "GROUP") {
      throw new Error("First child of frame must be a GROUP");
    }
    const groupChildren = firstChild.children;
    if (!Array.isArray(groupChildren) || groupChildren.length === 0) {
      throw new Error("Group must contain vector objects");
    }
    const vectors = [];
    for (const child of groupChildren) {
      if (child && child.type === "VECTOR") {
        vectors.push(child);
      }
    }
    if (vectors.length === 0) {
      throw new Error("Group must contain at least one VECTOR");
    }
    const flattenedVector = figma.flatten(vectors);
    flattenedVector.name = "Icon";
    const originalWidth = flattenedVector.width;
    const originalHeight = flattenedVector.height;
    figma.ungroup(firstChild);
    const components = [];
    const startX = sourceNode.x + sourceNode.width + 40;
    let xPos = startX;
    for (const [size, strokeWeight] of Object.entries(SIZES_AND_WEIGHTS)) {
      const sizeNum = parseInt(size);
      const iconClone = flattenedVector.clone();
      const maxOriginalDim = Math.max(originalWidth, originalHeight);
      const scaleFactor = sizeNum / maxOriginalDim;
      iconClone.resize(originalWidth * scaleFactor, originalHeight * scaleFactor);
      const scaledWidth = iconClone.width;
      const scaledHeight = iconClone.height;
      const scaledSize90Width = scaledWidth * 0.9;
      const scaledSize90Height = scaledHeight * 0.9;
      const offsetXFor90 = (scaledWidth - scaledSize90Width) / 2;
      const offsetYFor90 = (scaledHeight - scaledSize90Height) / 2;
      iconClone.resize(scaledSize90Width, scaledSize90Height);
      iconClone.x += offsetXFor90;
      iconClone.y += offsetYFor90;
      applyStrokeWeightRecursive(iconClone, strokeWeight);
      iconClone.name = "Icon";
      const frame = figma.createFrame();
      frame.resize(sizeNum, sizeNum);
      frame.fills = [];
      frame.appendChild(iconClone);
      const finalWidth = iconClone.width;
      const finalHeight = iconClone.height;
      const offsetX = (sizeNum - finalWidth) / 2;
      const offsetY = (sizeNum - finalHeight) / 2;
      iconClone.x = offsetX;
      iconClone.y = offsetY;
      frame.name = `Size=${sizeNum}`;
      frame.x = xPos;
      frame.y = sourceNode.y;
      xPos += frame.width + SPACING;
      const component = figma.createComponentFromNode(frame);
      components.push(component);
    }
    if (components.length > 1) {
      const componentSet = figma.combineAsVariants(components, figma.currentPage, 0);
      componentSet.name = iconName;
      componentSet.resize(412, 80);
      let totalComponentWidth = 0;
      const componentSetChildren = componentSet.children;
      if (componentSetChildren && Array.isArray(componentSetChildren)) {
        for (let i = 0; i < componentSetChildren.length; i++) {
          const child = componentSetChildren[i];
          totalComponentWidth += child.width;
          if (i < componentSetChildren.length - 1) {
            totalComponentWidth += SPACING;
          }
        }
        const frameWidth = 412;
        const frameHeight = 80;
        const horizontalOffset = (frameWidth - totalComponentWidth) / 2;
        let xPos2 = horizontalOffset;
        for (const child of componentSetChildren) {
          const childAny = child;
          const verticalOffset = (frameHeight - childAny.height) / 2;
          childAny.x = xPos2;
          childAny.y = verticalOffset;
          xPos2 += childAny.width + SPACING;
        }
      }
      try {
        const componentSetAny = componentSet;
        const stroke = {
          type: "SOLID",
          color: { r: 0.59, g: 0.28, b: 1 },
          // 9747FF in RGB
          opacity: 1
        };
        if ("strokes" in componentSetAny) {
          componentSetAny.strokes = [stroke];
        }
        if ("strokeWeight" in componentSetAny) {
          componentSetAny.strokeWeight = 1;
        }
        if ("strokeDashPattern" in componentSetAny) {
          componentSetAny.strokeDashPattern = [10, 5];
        }
        if ("strokeAlign" in componentSetAny) {
          componentSetAny.strokeAlign = "INSIDE";
        }
        if ("paddingLeft" in componentSetAny) {
          componentSetAny.paddingLeft = 16;
        }
        if ("paddingRight" in componentSetAny) {
          componentSetAny.paddingRight = 16;
        }
        if ("paddingTop" in componentSetAny) {
          componentSetAny.paddingTop = 16;
        }
        if ("paddingBottom" in componentSetAny) {
          componentSetAny.paddingBottom = 16;
        }
      } catch (e) {
      }
      if (workingFrame && "remove" in workingFrame) {
        workingFrame.remove();
      }
      const finalComponentChildren = componentSet.children;
      if (finalComponentChildren && Array.isArray(finalComponentChildren)) {
        for (const component of finalComponentChildren) {
          if ("constraints" in component) {
            component.constraints = {
              horizontal: "CENTER",
              vertical: "CENTER"
            };
          }
          const componentChildren = component.children;
          if (componentChildren && Array.isArray(componentChildren)) {
            for (const child of componentChildren) {
              if (child && child.name === "Icon" && "constraints" in child) {
                child.constraints = {
                  horizontal: "CENTER",
                  vertical: "CENTER"
                };
              }
            }
          }
        }
      }
      figma.viewport.scrollAndZoomIntoView([componentSet]);
    }
  }
  function applyStrokeWeightRecursive(node, weight) {
    if ("strokeWeight" in node) {
      node.strokeWeight = weight;
    }
    if ("children" in node) {
      const children = node.children;
      if (children && Array.isArray(children)) {
        children.forEach((child) => {
          applyStrokeWeightRecursive(child, weight);
        });
      }
    }
  }
  figma.showUI(__html__, { width: 400, height: 400 });
})();
