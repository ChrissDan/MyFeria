import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  // Obtener una conexión exclusiva para usar Transacciones (Garantiza consistencia)
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const { nombrePlato, ingredientes } = body; // ingredientes es un array de { nombre, cantidad, unidad }

    if (!nombrePlato || !ingredientes || ingredientes.length === 0) {
      return NextResponse.json({ error: 'Datos del plato incompletos' }, { status: 400 });
    }

    // Iniciar Transacción SQL
    await connection.beginTransaction();

    // 1. Insertar el plato (o verificar si ya existe)
    const [resultadoPlato]: any = await connection.query(
      'INSERT INTO platos (nombre) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
      [nombrePlato]
    );
    const platoId = resultadoPlato.insertId;

    // 2. Procesar cada ingrediente de la receta
    for (const ing of ingredientes) {
      // Insertar ingrediente en la tabla maestra si no existe, manteniendo el stock en 0 por defecto
      const [resultadoIng]: any = await connection.query(
        'INSERT INTO ingredientes (nombre, unidad_medida, stock_actual) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [ing.nombre, ing.unidad]
      );
      const ingredienteId = resultadoIng.insertId;

      // 3. Vincular el plato con el ingrediente en la tabla 'recetas'
      await connection.query(
        'INSERT INTO recetas (plato_id, ingrediente_id, cantidad_base) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cantidad_base = ?',
        [platoId, ingredienteId, ing.cantidad, ing.cantidad]
      );
    }

    // Confirmar cambios en TiDB Cloud
    await connection.commit();
    return NextResponse.json({ message: 'Plato e ingredientes creados con éxito', platoId });

  } catch (error: any) {
    // Si algo falla, revertimos todo para no dejar datos huérfanos
    await connection.rollback();
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Liberar la conexión de vuelta al Pool
    connection.release();
  }
}