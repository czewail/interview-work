import { catalog, validateCatalog } from '../lib/catalog';
validateCatalog(catalog);
console.log(`Catalog validated: ${catalog.products.length} products, ${catalog.skus.length} SKUs.`);
