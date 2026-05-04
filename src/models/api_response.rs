use serde::Serialize;

#[derive(Serialize, Debug)]
pub struct ApiResponse<T>{
   pub success:bool,
   pub message: String,
   pub data: Option<T>,
}

