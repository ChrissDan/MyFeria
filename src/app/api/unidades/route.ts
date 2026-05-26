import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Obtener todas las unidades registradas para cargar los dropdowns
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT nombre, abreviatura FROM unidades_medida ORDER BY nombre ASC');
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Registrar una nueva unidad desde el formulario de la app
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, abreviatura } = body;

    if (!nombre || !abreviatura) {
      return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 });
    }

    // Insertar en minúsculas para mantener consistencia
    await pool.query(
      'INSERT INTO unidades_medida (nombre, abreviatura) VALUES (?, ?)',
      [nombre.toLowerCase().trim(), abreviatura.toLowerCase().trim()]
    );

    return NextResponse.json({ message: 'Unidad registrada con éxito' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}