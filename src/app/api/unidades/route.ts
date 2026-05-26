import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Obtener todas las unidades registradas
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT nombre, abreviatura FROM unidades_medida ORDER BY nombre ASC');
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Registrar una nueva unidad
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, abreviatura } = body;

    if (!nombre || !abreviatura) {
      return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO unidades_medida (nombre, abreviatura) VALUES (?, ?)',
      [nombre.toLowerCase().trim(), abreviatura.toLowerCase().trim()]
    );

    return NextResponse.json({ message: 'Unidad registrada con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Editar una unidad existente (busca por el nombre original)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { nombreOriginal, nuevoNombre, nuevaAbreviatura } = body;

    if (!nombreOriginal || !nuevoNombre || !nuevaAbreviatura) {
      return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 });
    }

    await pool.query(
      'UPDATE unidades_medida SET nombre = ?, abreviatura = ? WHERE nombre = ?',
      [nuevoNombre.toLowerCase().trim(), nuevaAbreviatura.toLowerCase().trim(), nombreOriginal]
    );

    return NextResponse.json({ message: 'Unidad actualizada con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar una unidad por su nombre único
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nombre = searchParams.get('nombre');

    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre de la unidad' }, { status: 400 });
    }

    await pool.query('DELETE FROM unidades_medida WHERE nombre = ?', [nombre]);
    return NextResponse.json({ message: 'Unidad eliminada con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}