/** ambient declaration so TypeScript accepts `*.scss` imports; the default export is the compiled CSS string. */
declare module "*.scss" {
  const content: string;
  export default content;
}
