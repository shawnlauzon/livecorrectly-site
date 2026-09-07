import { redirect } from 'next/navigation';

export async function GET(_request: Request) {
  redirect('/see-your-design');
}
