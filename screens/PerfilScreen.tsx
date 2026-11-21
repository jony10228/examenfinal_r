
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function PerfilScreen() {
  const [nombre, setNombre] = useState('');
  const [carnet, setCarnet] = useState('');
  const [carrera, setCarrera] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [imagenSeleccionada, setImagenSeleccionada] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const avisar = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  const cargarPerfil = async () => {
    setCargando(true);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error('No hay sesión activa');
      }

      const { data, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, carnet, carrera, foto_url')
        .eq('id', auth.user.id)
        .single();

      if (error) throw error;

      setNombre(data.nombre_completo || '');
      setCarnet(data.carnet || '');
      setCarrera(data.carrera || '');
      setFoto(data.foto_url || null);
    } catch (error: any) {
      avisar('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  const seleccionarFoto = async () => {
    try {
      const resultado =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true,
        });

      if (resultado.canceled) return;

      const imagen = resultado.assets[0];

      if (!imagen.base64) {
        throw new Error('No se pudo leer la imagen');
      }

      const tipo = imagen.mimeType || 'image/jpeg';

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(tipo)) {
        throw new Error('Seleccioná una imagen JPG, PNG o WEBP');
      }

      if (imagen.fileSize && imagen.fileSize > 5 * 1024 * 1024) {
        throw new Error('La imagen no debe superar los 5 MB');
      }

      setImagenSeleccionada(imagen);
      setFoto(imagen.uri);
    } catch (error: any) {
      avisar('Error', error.message);
    }
  };

  const convertirBase64 = (base64: string): Uint8Array => {
    const caracteres =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    const limpio = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    const bytes: number[] = [];

    for (let i = 0; i < limpio.length; i += 4) {
      const a = caracteres.indexOf(limpio[i]);
      const b = caracteres.indexOf(limpio[i + 1]);
      const c =
        limpio[i + 2] === '='
          ? -1
          : caracteres.indexOf(limpio[i + 2]);
      const d =
        limpio[i + 3] === '='
          ? -1
          : caracteres.indexOf(limpio[i + 3]);

      bytes.push((a << 2) | (b >> 4));

      if (c >= 0) {
        bytes.push(((b & 15) << 4) | (c >> 2));
      }

      if (d >= 0) {
        bytes.push(((c & 3) << 6) | d);
      }
    }

    return new Uint8Array(bytes);
  };

  const guardarPerfil = async () => {
    if (!nombre.trim() || !carnet.trim() || !carrera.trim()) {
      avisar('Aviso', 'Completá todos los campos');
      return;
    }

    setGuardando(true);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error('No hay sesión activa');
      }

      const usuarioId = auth.user.id;
      let nuevaFoto = foto;

      if (imagenSeleccionada) {
        const imagen = imagenSeleccionada;

        if (!imagen.base64) {
          throw new Error('No se pudo procesar la fotografía');
        }

        const tipo = imagen.mimeType || 'image/jpeg';

        const extension =
          tipo === 'image/png'
            ? 'png'
            : tipo === 'image/webp'
            ? 'webp'
            : 'jpg';

        const ruta = `${usuarioId}/perfil-${Date.now()}.${extension}`;

        const bytes = convertirBase64(imagen.base64);

        if (bytes.byteLength > 5 * 1024 * 1024) {
          throw new Error('La fotografía supera los 5 MB');
        }

        const { error: storageError } = await supabase.storage
          .from('fotos-perfil')
          .upload(ruta, bytes, {
            contentType: tipo,
            upsert: false,
          });

        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage
          .from('fotos-perfil')
          .getPublicUrl(ruta);

        nuevaFoto = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('perfiles')
        .update({
          nombre_completo: nombre.trim(),
          carnet: carnet.trim(),
          carrera: carrera.trim(),
          foto_url: nuevaFoto,
        })
        .eq('id', usuarioId);

      if (error) throw error;

      setFoto(nuevaFoto);
      setImagenSeleccionada(null);

      avisar('Correcto', 'Perfil actualizado correctamente');
    } catch (error: any) {
      avisar('Error', error.message);
    } finally {
      setGuardando(false);
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
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={styles.contenido}
    >
      <Text style={styles.titulo}>Mi perfil</Text>

      <Text style={styles.subtitulo}>
        Actualizá tus datos universitarios
      </Text>

      <View style={styles.tarjeta}>
        <View style={styles.fotoContenedor}>
          {foto ? (
            <Image source={{ uri: foto }} style={styles.foto} />
          ) : (
            <View style={styles.fotoVacia}>
              <Text style={styles.inicial}>👤</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.botonFoto}
            onPress={seleccionarFoto}
          >
            <Text style={styles.botonFotoTexto}>
              Seleccionar fotografía
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre completo"
          placeholderTextColor="#777"
        />

        <Text style={styles.label}>Carné universitario</Text>
        <TextInput
          style={styles.input}
          value={carnet}
          onChangeText={setCarnet}
          placeholder="Tu número de carné"
          placeholderTextColor="#777"
        />

        <Text style={styles.label}>Carrera</Text>
        <TextInput
          style={styles.input}
          value={carrera}
          onChangeText={setCarrera}
          placeholder="Ingeniería en Sistemas"
          placeholderTextColor="#777"
        />

        <TouchableOpacity
          style={[
            styles.guardar,
            guardando && styles.deshabilitado,
          ]}
          disabled={guardando}
          onPress={guardarPerfil}
        >
          {guardando ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.guardarTexto}>
              Guardar perfil
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#090909',
  },
  contenido: {
    padding: 20,
    paddingBottom: 40,
  },
  centro: {
    flex: 1,
    backgroundColor: '#090909',
    justifyContent: 'center',
    alignItems: 'center',
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
  tarjeta: {
    backgroundColor: '#171717',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303030',
    width: '100%',
    maxWidth: 550,
    alignSelf: 'center',
  },
  fotoContenedor: {
    alignItems: 'center',
    marginBottom: 28,
  },
  foto: {
    width: 125,
    height: 125,
    borderRadius: 63,
    marginBottom: 15,
  },
  fotoVacia: {
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  inicial: {
    fontSize: 45,
  },
  botonFoto: {
    backgroundColor: '#303030',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  botonFotoTexto: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  label: {
    color: '#DDD',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#252525',
    color: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  guardar: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  guardarTexto: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deshabilitado: {
    opacity: 0.6,
  },
});
