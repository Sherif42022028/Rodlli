try {
  const sdk = require('@google/generative-ai')
  console.log("Generative AI SDK keys:", Object.keys(sdk))
} catch (e) {
  console.error("SDK import failed:", e)
}
