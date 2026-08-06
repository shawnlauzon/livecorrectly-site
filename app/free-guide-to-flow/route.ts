import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  redirect('/see-your-design');
}
