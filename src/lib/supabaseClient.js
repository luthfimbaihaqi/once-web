import { createClient } from '@supabase/supabase-js'

// GANTI YANG DI DALAM KUTIP DENGAN DATA ASLIMU DARI SUPABASE
const supabaseUrl = "https://kxnjnqpftqkjhejsophi.supabase.co" 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bmpucXBmdHFramhlanNvcGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMjk3NjYsImV4cCI6MjA3OTcwNTc2Nn0.bUqfhBXL4toPB4JN-tjEB16Qvb1PO_NEKosJLJShVyg" 

export const supabase = createClient(supabaseUrl, supabaseAnonKey)