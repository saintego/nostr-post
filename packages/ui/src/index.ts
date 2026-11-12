/**
 * @nostr-post/ui - main entry (framework-free)
 *
 * Design tokens as data and as CSS, the shared primitives as CSS, class and part names,
 * and the style overrides registry. No Lit, React or DOM: `/web` builds the Lit side on it.
 */

export {
  type ColorScheme,
  colorSchemes,
  isDarkScheme,
  parseColorScheme,
} from './colorScheme';
export { npClass, npExportParts, npModifier, type NpPart, npPart } from './names';
export { overrideDeclarations, overridesCss } from './overridesCss';
export { primitiveRules, primitivesCss, primitivesLayer } from './primitivesCss';
export {
  mixColors,
  type ResolvedTokens,
  resolveTokens,
  type TokenOverrides,
} from './resolveTokens';
export { slideIndex } from './slides';
export {
  allComponents,
  clearStyles,
  type OverrideMode,
  onStylesChange,
  type ResolvedOverrides,
  registerStyles,
  type StyleOverride,
  stylesFor,
  unstyled,
} from './styleOverrides';
export {
  type AccentRole,
  accentRoles,
  type BaseColorRole,
  baseColorRoles,
  type ColorMode,
  type ColorRole,
  type ContainerRole,
  colorTokens,
  containerMix,
  elevationTokens,
  motionTokens,
  type RadiusStep,
  radiusScale,
  radiusSteps,
  type SpaceStep,
  shapeTokens,
  spaceScale,
  type TypeStep,
  tokenName,
  tokenVar,
  typeScale,
  typeSteps,
  typeTokens,
} from './tokens';
export { tokenLayer, tokenRules, tokensCss } from './tokensCss';

/** Tokens and primitives together: the global stylesheet for apps and plain HTML (`ui.css`) */
export { uiCss } from './uiCss';
