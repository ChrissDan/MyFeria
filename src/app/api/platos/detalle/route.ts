import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Obtener los ingredientes específicos de un plato para cargarlos en el editor
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platoId = searchParams.get('id');

    if (!platoId) {
      return NextResponse.json({ error: 'Falta el ID del plato' }, { status: 400 });
    }

    const query = `
      SELECT i.nombre, r.cantidad_base as cantidad, i.unidad_medida as unidad
      FROM recetas r
      JOIN ingredientes i ON r.ingrediente_id = i.id
      WHERE r.plato_id = ?
    `;
    const [rows] = await pool.query(query, [platoId]);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Reemplazar los ingredientes editados del plato (Usa transacciones)
export async function PUT(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { platoId, ingredientes } = body;

    if (!platoId || !ingredientes) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Limpiar la receta vieja del plato
    await connection.query('DELETE FROM recetas WHERE plato_id = ?', [platoId]);

    // 2. Insertar los nuevos ingredientes (o actualizar si ya existen en maestro)
    for (const ing of ingredientes) {
      const [resultadoIng]: any = await connection.query(
        'INSERT INTO ingredientes (nombre, unidad_medida, stock_actual) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [ing.nombre, ing.unidad]
      );
      const ingredienteId = resultadoIng.insertId;

      await connection.query(
        'INSERT INTO recetas (plato_id, ingrediente_id, cantidad_base) VALUES (?, ?, ?)',
        [platoId, ingredienteId, ing.cantidad]
      );
    }

    await connection.commit();
    return NextResponse.json({ message: 'Plato modificado con éxito' });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}