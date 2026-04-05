export type CategoryKey =
  | 'Todos'
  | 'Sorvetes'
  | 'Potes'
  | 'Picolés'
  | 'Milk-shakes'
  | 'Sobremesas'
  | 'Bebidas';

export type ProductCard = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Exclude<CategoryKey, 'Todos'>;
  badge: string;
  accent: string;
  imageLabel: string;
  calories?: string;
};

export type StoreCard = {
  slug: string;
  name: string;
  city: string;
  distance: string;
  deliveryTime: string;
  open: boolean;
  tone: string;
};

export type TrackingStep = {
  label: string;
  detail: string;
};

export const categories: CategoryKey[] = [
  'Todos',
  'Sorvetes',
  'Potes',
  'Picolés',
  'Milk-shakes',
  'Sobremesas',
  'Bebidas',
];

export const stores: StoreCard[] = [
  {
    slug: 'oggi-sao-jose',
    name: 'Oggi São José',
    city: 'São José da Coroa Grande',
    distance: '1,2 km',
    deliveryTime: '18-28 min',
    open: true,
    tone: 'from-rose-400 via-orange-300 to-amber-200',
  },
  {
    slug: 'oggi-praia',
    name: 'Oggi Praia',
    city: 'Futuro ponto da rede',
    distance: '3,8 km',
    deliveryTime: '20-35 min',
    open: false,
    tone: 'from-cyan-400 via-sky-300 to-emerald-200',
  },
];

export const featuredProducts: ProductCard[] = [
  {
    id: 'prod-1',
    name: 'Pote 1L Chocolate',
    description: 'Chocolate intenso e cremoso, perfeito para dividir.',
    price: 35.9,
    category: 'Potes',
    badge: 'Mais pedido',
    accent: 'from-rose-500 to-orange-400',
    imageLabel: '1L',
    calories: '620 kcal',
  },
  {
    id: 'prod-2',
    name: 'Pote 1L Morango',
    description: 'Doce, leve e refrescante para qualquer hora do dia.',
    price: 34.9,
    category: 'Potes',
    badge: 'Clássico',
    accent: 'from-pink-500 to-fuchsia-400',
    imageLabel: '1L',
    calories: '590 kcal',
  },
  {
    id: 'prod-3',
    name: 'Picolé Frutas Vermelhas',
    description: 'Crocante por fora, geladinho por dentro.',
    price: 8.5,
    category: 'Picolés',
    badge: 'Leve',
    accent: 'from-amber-400 to-rose-300',
    imageLabel: 'Ice',
  },
  {
    id: 'prod-4',
    name: 'Milk-shake Oggi',
    description: 'Creme gelado batido na medida para o fim de tarde.',
    price: 19.9,
    category: 'Milk-shakes',
    badge: 'Novo',
    accent: 'from-emerald-400 to-teal-300',
    imageLabel: 'M',
  },
  {
    id: 'prod-5',
    name: 'Açaí com toppings',
    description: 'Energia, textura e combinação sob medida.',
    price: 24.9,
    category: 'Sobremesas',
    badge: 'Energia',
    accent: 'from-violet-500 to-indigo-400',
    imageLabel: 'A',
  },
  {
    id: 'prod-6',
    name: 'Água mineral gelada',
    description: 'Para fechar o pedido com praticidade.',
    price: 4.5,
    category: 'Bebidas',
    badge: 'Extra',
    accent: 'from-sky-500 to-cyan-400',
    imageLabel: 'H2O',
  },
];

export const trackingSteps: TrackingStep[] = [
  { label: 'Pedido confirmado', detail: 'A loja recebeu e separou os itens.' },
  { label: 'Em preparo', detail: 'Seu pedido está sendo montado pela equipe.' },
  { label: 'Saiu para entrega', detail: 'Motoboy aceitou e está a caminho.' },
  { label: 'Entregue', detail: 'Pedido finalizado com sucesso.' },
];

export const benefits = [
  'PWA leve, abre no iPhone e no Android sem loja',
  'Tracking em tempo real pronto para receber o motoboy',
  'Cadastro também pode liberar o Wi-Fi da loja',
  'Base preparada para múltiplas lojas no futuro',
];

export const quickStats = [
  { label: 'Tempo médio', value: '18 min' },
  { label: 'Pedido mínimo', value: 'R$ 20,00' },
  { label: 'Motoboys próximos', value: '4 online' },
  { label: 'Conversão PWA', value: '+32%' },
];
