
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image,
  TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../lib/supabase';

type Equipo = {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  disponible: boolean;
};

export default function CatalogoScreen() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [solicitando, setSolicitando] = useState<number | null>(null);

  const cargarEquipos = async () => {
    const { data, error } = await supabase
      .from('equipos')
      .select('*')
      .order('id');

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEquipos(data || []);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarEquipos();
  }, []);

  const solicitar = async (equipoId: number) => {
    setSolicitando(equipoId);

    try {
      const { data: usuario, error: authError } =
        await supabase.auth.getUser();

      if (authError || !usuario.user) {
        throw new Error('Debés iniciar sesión');
      }

      const { error } = await supabase
        .from('prestamos')
        .insert({
          usuario_id: usuario.user.id,
          equipo_id: equipoId,
          estado: 'pendiente',
        });

      if (error) throw error;

      Alert.alert(
        'Solicitud enviada',
        'Tu préstamo quedó pendiente de aprobación.'
      );

      await cargarEquipos();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSolicitando(null);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Equipos disponibles</Text>
      <Text style={styles.subtitulo}>
        Seleccioná el equipo que necesitás
      </Text>

      <FlatList
        data={equipos}
        keyExtractor={(item) => item.id.toString()}
        refreshing={cargando}
        onRefresh={cargarEquipos}
        ListEmptyComponent={
          <Text style={styles.subtitulo}>
            No hay equipos registrados.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.tarjeta}>
            {item.imagen_url && (
              <Image
                source={{ uri: item.imagen_url }}
                style={styles.imagen}
              />
            )}

            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.descripcion}>
              {item.descripcion}
            </Text>

            <Text style={{
              color: item.disponible ? '#22C55E' : '#EF4444',
              marginBottom: 12
            }}>
              {item.disponible ? 'Disponible' : 'No disponible'}
            </Text>

            <TouchableOpacity
              style={[
                styles.boton,
                (!item.disponible || solicitando === item.id) &&
                  styles.deshabilitado
              ]}
              disabled={!item.disponible || solicitando !== null}
              onPress={() => solicitar(item.id)}
            >
              <Text style={styles.botonTexto}>
                {solicitando === item.id
                  ? 'Enviando...'
                  : 'Solicitar préstamo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#090909',
    padding: 20,
    paddingTop: 55,
  },
  centro: {
    flex: 1,
    backgroundColor: '#090909',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitulo: {
    color: '#999',
    marginTop: 8,
    marginBottom: 20,
  },
  tarjeta: {
    backgroundColor: '#1C1C1C',
    borderRadius: 15,
    padding: 15,
    marginBottom: 18,
  },
  imagen: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 12,
  },
  nombre: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  descripcion: {
    color: '#AAA',
    marginTop: 6,
    marginBottom: 10,
  },
  boton: {
    backgroundColor: '#F59E0B',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  deshabilitado: {
    backgroundColor: '#555',
  },
  botonTexto: {
    color: '#000',
    fontWeight: 'bold',
  },
});
