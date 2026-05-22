import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface CategoriaItem {
  id: string;
  label: string;
  emoji: string;
  padrao?: boolean;
  palavrasChave?: string[];
}

export const CATEGORIAS_PADRAO: CategoriaItem[] = [
  {
    id: 'alimentos',
    label: 'Alimentos',
    emoji: '🍎',
    padrao: true,
    palavrasChave: ['alimento', 'comida', 'bebida', 'arroz', 'feijão', 'feijao', 'leite', 'farinha', 'açúcar', 'acucar', 'óleo', 'oleo', 'massa', 'biscoito', 'café', 'cafe', 'pão', 'pao', 'macarrão', 'macarrao'],
  },
  {
    id: 'higiene',
    label: 'Higiene',
    emoji: '🧴',
    padrao: true,
    palavrasChave: ['higiene', 'sabonete', 'shampoo', 'condicionador', 'dental', 'desodorante', 'absorvente', 'fralda', 'bebê', 'bebe', 'infantil', 'escova', 'creme'],
  },
  {
    id: 'limpeza',
    label: 'Limpeza',
    emoji: '🧹',
    padrao: true,
    palavrasChave: ['limpeza', 'detergente', 'desinfetante', 'alvejante', 'multiuso', 'amaciante', 'sabão', 'sabao', 'esponja', 'vassoura', 'rodo'],
  },
];

const ref = () => doc(db, 'config', 'categorias');

function parseLista(data: unknown): CategoriaItem[] {
  const lista = (data as any)?.lista as CategoriaItem[] | undefined;
  return lista?.length ? lista : CATEGORIAS_PADRAO;
}

export function subscribeCategorias(
  callback: (cats: CategoriaItem[]) => void
): () => void {
  return onSnapshot(ref(), (snap) => {
    callback(snap.exists() ? parseLista(snap.data()) : CATEGORIAS_PADRAO);
  }, () => callback(CATEGORIAS_PADRAO));
}

export async function getCategorias(): Promise<CategoriaItem[]> {
  const snap = await getDoc(ref());
  return snap.exists() ? parseLista(snap.data()) : CATEGORIAS_PADRAO;
}

export async function salvarCategorias(cats: CategoriaItem[]): Promise<void> {
  await setDoc(ref(), { lista: cats });
}

export function gerarSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
