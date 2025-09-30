import { createClient } from '@supabase/supabase-js';

// Lấy URL và khóa ẩn danh của Supabase từ biến môi trường
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Kiểm tra xem các biến môi trường có tồn tại không, nếu không thì ném lỗi
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Thiếu cấu hình Supabase. Vui lòng kiểm tra tệp .env của bạn.');
}

// Tạo và xuất client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
