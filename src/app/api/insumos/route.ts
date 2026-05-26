import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Obtener todos los ingredientes del catálogo base
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT id, nombre, unidad_medida AS unidad FROM ingredientes ORDER BY nombre ASC');
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Registrar un nuevo ingrediente en el catálogo central
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, unidad } = body;

    if (!nombre || !unidad) {
      return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO ingredientes (nombre, unidad_medida, stock_actual) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE unidad_medida = VALUES(unidad_medida)',
      [nombre.toLowerCase().trim(), unidad]
    );

    return NextResponse.json({ message: 'Ingrediente registrado con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Editar el nombre o unidad de un ingrediente desde la app
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nuevoNombre, nuevaUnidad } = body;

    if (!id || !nuevoNombre || !nuevaUnidad) {
      return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 });
    }

    await pool.query(
      'UPDATE ingredientes SET nombre = ?, unidad_medida = ? WHERE id = ?',
      [nuevoNombre.toLowerCase().trim(), nuevaUnidad, id]
    );

    return NextResponse.json({ message: 'Ingrediente actualizado con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un ingrediente por ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del ingrediente' }, { status: 400 });
    }

    await pool.query('DELETE FROM ingredientes WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Ingrediente eliminado con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}