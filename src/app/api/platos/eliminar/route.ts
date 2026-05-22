import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del plato' }, { status: 400 });
    }

    // Al eliminar el plato, por restricciones CASCADE de nuestra BD, 
    // se eliminarán automáticamente sus registros en la tabla 'recetas'.
    await pool.query('DELETE FROM platos WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Plato eliminado con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}