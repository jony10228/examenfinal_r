
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';

import { supabase } from './lib/supabase';
import CatalogoScreen from './screens/CatalogoScreen';
import HistorialScreen from './screens/HistorialScreen';
import AdminScreen from './screens/AdminScreen';
import type { Session } from '@supabase/supabase-js';

type Pantalla = 'catalogo' | 'historial' | 'admin';
type Rol = 'estudiante' | 'administrador';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoRol, setCargandoRol] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [registro, setRegistro] = useState(false);
  const [pantalla, setPantalla] = useState<Pantalla>('catalogo');
  const [rol, setRol] = useState<Rol>('estudiante');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [carnet, setCarnet] = useState('');
  const [carrera, setCarrera] = useState('');

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  const mostrarError = (mensaje: string) => {
    mostrarMensaje('Aviso', mensaje);
  };

  // VERIFICAR SESIÓN
  useEffect(() => {
    let activo = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!activo) return;

        if (error) {
          mostrarError(error.message);
        }

        setSession(data.session);
      })
      .catch((error) => {
        if (activo) {
          mostrarError(error.message);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, nuevaSession) => {
          if (activo) {
            setSession(nuevaSession);
          }
        }
      );

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // CONSULTAR ROL DEL USUARIO
  useEffect(() => {
    let activo = true;

    const verificarRol = async () => {
      if (!session?.user.id) {
        setRol('estudiante');
        setPantalla('catalogo');
        setCargandoRol(false);
        return;
      }

      setCargandoRol(true);
      setRol('estudiante');
      setPantalla('catalogo');

      const usuarioId = session.user.id;

      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', usuarioId)
          .single();

        if (error) throw error;

        if (activo) {
          setRol(
            data?.rol === 'administrador'
              ? 'administrador'
              : 'estudiante'
          );
        }
      } catch (error: any) {
        if (activo) {
          setRol('estudiante');
          mostrarError(
            'No se pudo verificar el rol: ' + error.message
          );
        }
      } finally {
        if (activo) setCargandoRol(false);
      }
    };

    verificarRol();

    return () => {
      activo = false;
    };
  }, [session?.user.id]);

  // REGISTRO E INICIO DE SESIÓN
  const autenticar = async () => {
    if (!email.trim() || !password) {
      mostrarError('Ingresá correo y contraseña');
      return;
    }

    if (
      registro &&
      (!nombre.trim() || !carnet.trim() || !carrera.trim())
    ) {
      mostrarError('Completá todos los datos del estudiante');
      return;
    }

    if (registro && password.length < 6) {
      mostrarError(
        'La contraseña debe tener al menos 6 caracteres'
      );
      return;
    }

    setProcesando(true);

    try {
      if (registro) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              nombre_completo: nombre.trim(),
              carnet: carnet.trim(),
              carrera: carrera.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session && data.user) {
          const { error: perfilError } = await supabase
            .from('perfiles')
            .update({
              nombre_completo: nombre.trim(),
              carnet: carnet.trim(),
              carrera: carrera.trim(),
            })
            .eq('id', data.user.id);

          if (perfilError) throw perfilError;
        }

        mostrarMensaje(
          'Registro realizado',
          data.session
            ? 'Tu cuenta fue creada correctamente.'
            : 'Revisá tu correo para confirmar tu cuenta.'
        );

        setRegistro(false);
        setPassword('');
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

        if (error) throw error;

        setPantalla('catalogo');
      }
    } catch (error: any) {
      mostrarError(error.message || 'Ocurrió un error');
    } finally {
      setProcesando(false);
    }
  };

  // CERRAR SESIÓN
  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      mostrarError(error.message);
    } else {
      setSession(null);
      setPassword('');
      setPantalla('catalogo');
      setRol('estudiante');
    }
  };

  // PANTALLA DE CARGA
  if (cargando || (session && cargandoRol)) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.cargandoTexto}>
          Cargando aplicación...
        </Text>
      </View>
    );
  }

  // USUARIO AUTENTICADO
  if (session) {
    return (
      <View style={styles.pantallaPrincipal}>

        {/* BARRA SUPERIOR */}
        <View style={styles.barraSuperior}>
          <View style={styles.infoUsuario}>
            <Text style={styles.marca}>LAB CONTROL</Text>

            <Text
              style={styles.correoUsuario}
              numberOfLines={1}
            >
              {session.user.email}
            </Text>

            <Text style={styles.rolTexto}>
              {rol === 'administrador'
                ? 'Administrador'
                : 'Estudiante'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botonSalir}
            onPress={cerrarSesion}
          >
            <Text style={styles.textoSalir}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* MENÚ DE NAVEGACIÓN */}
        <View style={styles.menu}>

          <TouchableOpacity
            style={[
              styles.botonMenu,
              pantalla === 'catalogo' && styles.menuActivo,
            ]}
            onPress={() => setPantalla('catalogo')}
          >
            <Text
              style={[
                styles.textoMenu,
                pantalla === 'catalogo' && styles.textoActivo,
              ]}
            >
              Equipos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonMenu,
              pantalla === 'historial' && styles.menuActivo,
            ]}
            onPress={() => setPantalla('historial')}
          >
            <Text
              style={[
                styles.textoMenu,
                pantalla === 'historial' && styles.textoActivo,
              ]}
            >
              Mis préstamos
            </Text>
          </TouchableOpacity>

          {rol === 'administrador' && (
            <TouchableOpacity
              style={[
                styles.botonMenu,
                pantalla === 'admin' && styles.menuActivo,
              ]}
              onPress={() => setPantalla('admin')}
            >
              <Text
                style={[
                  styles.textoMenu,
                  pantalla === 'admin' && styles.textoActivo,
                ]}
              >
                Administración
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CONTENIDO */}
        <View style={styles.contenido}>
          {pantalla === 'catalogo' ? (
            <CatalogoScreen />
          ) : pantalla === 'historial' ? (
            <HistorialScreen />
          ) : rol === 'administrador' ? (
            <AdminScreen />
          ) : (
            <CatalogoScreen />
          )}
        </View>

      </View>
    );
  }

  // LOGIN Y REGISTRO
  return (
    <ScrollView
      contentContainerStyle={styles.contenedor}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>◈</Text>

      <Text style={styles.titulo}>LAB CONTROL</Text>

      <Text style={styles.subtitulo}>
        Sistema de Gestión de Equipos de Laboratorio
      </Text>

      <View style={styles.formulario}>
        <Text style={styles.encabezado}>
          {registro ? 'Crear cuenta' : 'Bienvenido'}
        </Text>

        <Text style={styles.descripcion}>
          {registro
            ? 'Registrate para solicitar equipos'
            : 'Iniciá sesión para continuar'}
        </Text>

        {registro && (
          <>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre completo"
              placeholderTextColor="#888"
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={styles.label}>Carné universitario</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de carné"
              placeholderTextColor="#888"
              value={carnet}
              onChangeText={setCarnet}
            />

            <Text style={styles.label}>Carrera</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingeniería en Sistemas"
              placeholderTextColor="#888"
              value={carrera}
              onChangeText={setCarrera}
            />
          </>
        )}

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresá tu contraseña"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[
            styles.boton,
            procesando && styles.botonDeshabilitado,
          ]}
          onPress={autenticar}
          disabled={procesando}
        >
          {procesando ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.botonTexto}>
              {registro ? 'Crear cuenta' : 'Iniciar sesión'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRegistro(!registro)}
          disabled={procesando}
        >
          <Text style={styles.cambiar}>
            {registro
              ? '¿Ya tenés cuenta? Iniciar sesión'
              : '¿No tenés cuenta? Registrarte'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.pie}>
        Universidad Mariano Gálvez de Guatemala
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    backgroundColor: '#090909',
    justifyContent: 'center',
    padding: 25,
  },
  centro: {
    flex: 1,
    backgroundColor: '#090909',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  cargandoTexto: {
    color: '#999',
    marginTop: 15,
  },
  logo: {
    color: '#F59E0B',
    fontSize: 65,
    textAlign: 'center',
    marginBottom: 12,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 3,
  },
  subtitulo: {
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 35,
  },
  formulario: {
    backgroundColor: '#171717',
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#303030',
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  encabezado: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  descripcion: {
    color: '#999',
    marginBottom: 25,
  },
  label: {
    color: '#DDD',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#252525',
    color: '#FFF',
    padding: 16,
    borderRadius: 10,
    marginBottom: 18,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  boton: {
    backgroundColor: '#F59E0B',
    padding: 17,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cambiar: {
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: 23,
  },
  pie: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
  },
  pantallaPrincipal: {
    flex: 1,
    backgroundColor: '#090909',
  },
  barraSuperior: {
    backgroundColor: '#171717',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'web' ? 15 : 45,
    borderBottomWidth: 1,
    borderBottomColor: '#303030',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoUsuario: {
    flex: 1,
    marginRight: 12,
  },
  marca: {
    color: '#F59E0B',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  correoUsuario: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  rolTexto: {
    color: '#F59E0B',
    fontSize: 11,
    marginTop: 5,
    fontWeight: 'bold',
  },
  botonSalir: {
    backgroundColor: '#303030',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textoSalir: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  menu: {
    flexDirection: 'row',
    backgroundColor: '#171717',
    padding: 12,
    gap: 8,
  },
  botonMenu: {
    flex: 1,
    backgroundColor: '#303030',
    paddingVertical: 14,
    paddingHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuActivo: {
    backgroundColor: '#F59E0B',
  },
  textoMenu: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  textoActivo: {
    color: '#000',
  },
  contenido: {
    flex: 1,
  },
});
