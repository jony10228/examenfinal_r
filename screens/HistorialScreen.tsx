
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';

type Prestamo = {
  id: number;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  estado: string;
  equipos: {
    nombre: string;
  } | null;
};

export default function HistorialScreen() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarHistorial = async () => {
    setCargando(true);

    const { data: usuario, error: authError } =
      await supabase.auth.getUser();

    if (authError || !usuario.user) {
      setCargando(false);
      return;
    }

    const { data, error } = await supabase
      .from('prestamos')
      .select(`
        id,
        fecha_prestamo,
        fecha_devolucion,
        estado,
        equipos (nombre)
      `)
      .eq('usuario_id', usuario.user.id)
      .order('fecha_prestamo', { ascending: false });

    if (error) {
      const mensaje = error.message;
      if (Platform.OS === 'web') {
        window.alert(mensaje);
      } else {
        Alert.alert('Error', mensaje);
      }
    } else {
      setPrestamos((data || []) as Prestamo[]);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const colorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return '#F59E0B';
      case 'aprobado': return '#22C55E';
      case 'rechazado': return '#EF4444';
      case 'devuelto': return '#60A5FA';
      default: return '#999';
    }
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Mis préstamos</Text>
      <Text style={styles.subtitulo}>
        Consultá tus solicitudes y su estado
      </Text>

      <TouchableOpacity
        style={styles.actualizar}
        onPress={cargarHistorial}
      >
        <Text style={styles.actualizarTexto}>
          Actualizar historial
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
              Todavía no tenés préstamos registrados.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.tarjeta}>
              <Text style={styles.nombre}>
                {item.equipos?.nombre || 'Equipo'}
              </Text>

              <Text style={styles.detalle}>
                Fecha de préstamo:{' '}
                {new Date(item.fecha_prestamo).toLocaleDateString()}
              </Text>

              <Text style={styles.detalle}>
                Fecha de devolución:{' '}
                {item.fecha_devolucion
                  ? new Date(item.fecha_devolucion).toLocaleDateString()
                  : 'Pendiente'}
              </Text>

              <Text
                style={[
                  styles.estado,
                  { color: colorEstado(item.estado) }
                ]}
              >
                {item.estado.toUpperCase()}
              </Text>
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
    marginTop: 35,
  },
  tarjeta: {
    backgroundColor: '#1C1C1C',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
  },
  nombre: {
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
    fontWeight: 'bold',
    marginTop: 12,
  },
});
