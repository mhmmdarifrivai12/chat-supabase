require('dotenv').config();
const Hapi = require('@hapi/hapi');
const { createClient } = require('@supabase/supabase-js');
const Path = require('path');

// Inisialisasi Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const init = async () => {
    const server = Hapi.server({
    port: 3000,
    host: 'localhost',
    routes: {
        cors: {
        origin: ['*'], // izinkan semua origin, bisa kamu sesuaikan
        },
        files: {
        relativeTo: Path.join(__dirname, 'public'),
        },
    },
    });


  await server.register(require('@hapi/inert'));


  // REGISTER
  server.route({
    method: 'POST',
    path: '/register',
    handler: async (req, h) => {
      const { name, username, password } = req.payload;

      if (!name || !username || !password) {
        return h.response({ error: 'All fields are required' }).code(400);
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{ name, username, password }])
        .select();

      if (error) {
        return h.response({ error: error.message }).code(400);
      }

      return h.response({ message: 'Registered successfully', user: data[0] }).code(201);
    }
  });

  // Menu Home (default route)
server.route({
  method: 'GET',
  path: '/',
  handler: (req, h) => {
    return `
      <h1>Welcome to My API Home</h1>
      <ul>
        <li><a href="/users">List Users</a></li>
        <li><a href="/messages?sender_id=1&receiver_id=2">Get Messages (Example)</a></li>
        <li>POST /register - Register User</li>
        <li>POST /login - Login User</li>
        <li>POST /chat - Send Message</li>
      </ul>
    `;
  }
});


  // LOGIN
  server.route({
    method: 'POST',
    path: '/login',
    handler: async (req, h) => {
      const { username, password } = req.payload;

      if (!username || !password) {
        return h.response({ error: 'Username and password are required' }).code(400);
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        return h.response({ error: 'Invalid credentials' }).code(401);
      }

      return h.response({ message: 'Login success', user: data }).code(200);
    }
  });

  // SEND MESSAGE
  server.route({
    method: 'POST',
    path: '/chat',
    handler: async (req, h) => {
      const { sender_id, receiver_id, content } = req.payload;

      if (!sender_id || !receiver_id || !content) {
        return h.response({ error: 'Missing fields' }).code(400);
      }

      const { error } = await supabase
        .from('messages')
        .insert([{ sender_id, receiver_id, content }]);

      if (error) {
        return h.response({ error: error.message }).code(400);
      }

      return h.response({ message: 'Message sent' }).code(201);
    }
  });

  // GET MESSAGES
  server.route({
    method: 'GET',
    path: '/messages',
    handler: async (req, h) => {
      const { sender_id, receiver_id } = req.query;

      if (!sender_id || !receiver_id) {
        return h.response({ error: 'sender_id and receiver_id are required' }).code(400);
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`)
        .order('created_at', { ascending: true });

      if (error) {
        return h.response({ error: error.message }).code(400);
      }

      return h.response(data).code(200);
    }
  });

  // Ambil daftar user (id dan name saja)
server.route({
  method: 'GET',
  path: '/users',
  handler: async (req, h) => {
    const { data, error } = await supabase.from('users').select('id, name');
    if (error) return h.response({ error: error.message }).code(400);
    return h.response(data).code(200);
  }
});


  // Start server
  await server.start();
  console.log('Server running on', server.info.uri);
};

init();
