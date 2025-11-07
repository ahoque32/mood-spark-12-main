export interface DatabaseError {
  message: string;
  statusCode: number;
}

export function handleDatabaseError(error: any): DatabaseError {
  // Handle Supabase specific errors
  if (error?.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return {
          message: 'A record with this information already exists',
          statusCode: 409
        };
      case '23503': // Foreign key violation
        return {
          message: 'Invalid reference to related record',
          statusCode: 400
        };
      case '22001': // String too long
        return {
          message: 'The provided value is too long for the field',
          statusCode: 400
        };
      case 'PGRST116': // Record not found
        return {
          message: 'Record not found',
          statusCode: 404
        };
      case '42501': // Insufficient privilege
        return {
          message: 'Insufficient permissions',
          statusCode: 403
        };
      case '08P01': // Protocol violation
      case '08006': // Connection failure
      case '08001': // SQL client unable to establish connection
        return {
          message: 'Database connection failed',
          statusCode: 503
        };
    }
  }

  // Handle Supabase Auth errors
  if (error?.message) {
    if (error.message.includes('duplicate key')) {
      return {
        message: 'A record with this information already exists',
        statusCode: 409
      };
    }
    if (error.message.includes('not found')) {
      return {
        message: 'Record not found',
        statusCode: 404
      };
    }
    if (error.message.includes('Invalid login')) {
      return {
        message: 'Invalid credentials',
        statusCode: 401
      };
    }
    if (error.message.includes('connection')) {
      return {
        message: 'Database connection failed',
        statusCode: 503
      };
    }
  }

  // Generic error handling
  return {
    message: error?.message || 'An unexpected error occurred',
    statusCode: error?.status || 500
  };
}