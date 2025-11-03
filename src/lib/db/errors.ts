import { Prisma } from '@prisma/client';

export interface DatabaseError {
  message: string;
  statusCode: number;
}

export function handlePrismaError(error: any): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          message: 'A record with this information already exists',
          statusCode: 409
        };
      case 'P2025':
        return {
          message: 'Record not found',
          statusCode: 404
        };
      case 'P2003':
        return {
          message: 'Invalid reference to related record',
          statusCode: 400
        };
      case 'P2000':
        return {
          message: 'The provided value is too long for the field',
          statusCode: 400
        };
      case 'P2001':
        return {
          message: 'Record does not exist',
          statusCode: 404
        };
      default:
        return {
          message: 'Database operation failed',
          statusCode: 500
        };
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      message: 'Unknown database error occurred',
      statusCode: 500
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: 'Invalid data provided',
      statusCode: 400
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      message: 'Database connection failed',
      statusCode: 503
    };
  }

  // Generic error handling
  return {
    message: error.message || 'An unexpected error occurred',
    statusCode: 500
  };
}