
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';

type Prestamo = {
  id: number;
  estado: string;
  fecha_prestamo: string;
  perfiles: {
    nombre_completo: string | null;
    carnet: string | null;
  } | null;
  equipos: {
    nombre: string;
  } | null;
};

export default function AdminScreen() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);

  const avisar = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  const cargarPrestamos = async () => {
    setCargando(true);

    const { data, error } = await supabase
      .from('prestamos')
      .select(`
        id,
        estado,
        fecha_prestamo,
        perfiles (nombre_completo, carnet),
        equipos (nombre)
      `)
      .order('fecha_prestamo', { ascending: false });

    if (error) {
      avisar('Error', error.message);
    } else {
      setPrestamos((data || []) as Prestamo[]);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarPrestamos();
  }, []);

  const cambiarEstado = async (
    id: number,
    estado: 'aprobado' | 'rechazado' | 'devuelto'
  ) => {
    setProcesando(id);

    try {
      const { error } = await supabase
        .from('prestamos')
        .update({ estado })
        .eq('id', id);

      if (error) throw error;

      avisar('Correcto', `Préstamo ${estado}`);
      await cargarPrestamos();
    } catch (error: any) {
      avisar('Error', error.message);
    } finally {
      setProcesando(null);
    }
  };

  const pendientes = prestamos.filter(
    (p) => p.estado === 'pendiente'
  ).length;

  const activos = prestamos.filter(
    (p) => p.estado === 'aprobado'
  ).length;

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Administración</Text>
      <Text style={styles.subtitulo}>
        Gestión de préstamos de laboratorio
      </Text>

      <View style={styles.resumen}>
        <View style={styles.resumenTarjeta}>
          <Text style={styles.numero}>{pendientes}</Text>
          <Text style={styles.resumenTexto}>Pendientes</Text>
        </View>

        <View style={styles.resumenTarjeta}>
          <Text style={styles.numero}>{activos}</Text>
          <Text style={styles.resumenTexto}>Activos</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actualizar}
        onPress={cargarPrestamos}
      >
        <Text style={styles.actualizarTexto}>
          Actualizar solicitudes
        </Text>
      </TouchableOpacity>

      {cargando ? (
        <ActivityIndicator size="large" color="#F59E0B" />
      ) : (
        <FlatList
          data={prestamos}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.vacio}>
              No hay solicitudes registradas.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.tarjeta}>
              <Text style={styles.equipo}>
                {item.equipos?.nombre || 'Equipo'}
              </Text>

              <Text style={styles.detalle}>
                Estudiante: {item.perfiles?.nombre_completo || 'Sin nombre'}
              </Text>

              <Text style={styles.detalle}>
                Carné: {item.perfiles?.carnet || 'Sin carné'}
              </Text>

              <Text style={styles.detalle}>
                Fecha: {new Date(item.fecha_prestamo).toLocaleDateString()}
              </Text>

              <Text style={styles.estado}>
                Estado: {item.estado.toUpperCase()}
              </Text>

              {item.estado === 'pendiente' && (
                <View style={styles.botones}>
                  <TouchableOpacity
                    style={styles.aprobar}
                    disabled={procesando !== null}
                    onPress={() => cambiarEstado(item.id, 'aprobado')}
                  >
                    <Text style={styles.botonTexto}>Aprobar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rechazar}
                    disabled={procesando !== null}
                    onPress={() => cambiarEstado(item.id, 'rechazado')}
                  >
                    <Text style={styles.botonTexto}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.estado === 'aprobado' && (
                <TouchableOpacity
                  style={styles.devolver}
                  disabled={procesando !== null}
                  onPress={() => cambiarEstado(item.id, 'devuelto')}
                >
                  <Text style={styles.botonTexto}>
                    Registrar devolución
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#090909',
    padding: 20,
  },
  titulo: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#999',
    marginTop: 8,
    marginBottom: 20,
  },
  resumen: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  resumenTarjeta: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  numero: {
    color: '#F59E0B',
    fontSize: 30,
    fontWeight: 'bold',
  },
  resumenTexto: {
    color: '#AAA',
    marginTop: 5,
  },
  actualizar: {
    backgroundColor: '#303030',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  actualizarTexto: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  vacio: {
    color: '#999',
    textAlign: 'center',
    marginTop: 30,
  },
  tarjeta: {
    backgroundColor: '#1C1C1C',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
  },
  equipo: {
    color: '#FFF',
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detalle: {
    color: '#AAA',
    marginBottom: 6,
  },
  estado: {
    color: '#F59E0B',
    fontWeight: 'bold',
    marginVertical: 12,
  },
  botones: {
    flexDirection: 'row',
    gap: 10,
  },
  aprobar: {
    flex: 1,
    backgroundColor: '#22C55E',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  rechazar: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  devolver: {
    backgroundColor: '#60A5FA',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#000',
    fontWeight: 'bold',
  },
});
