import { CustomerPwa } from '@/components/customer-pwa';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3010/api';
const STORE_SLUG = 'oggi-sao-jose';

async function loadBackendProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/stores/${STORE_SLUG}/products`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const products = (await response.json()) as Array<{
      id: string;
      name: string;
      description: string;
      price: number;
    }>;

    return products;
  } catch {
    return [];
  }
}

export default async function Home() {
  const backendProducts = await loadBackendProducts();

  return <CustomerPwa backendProducts={backendProducts} />;
}
