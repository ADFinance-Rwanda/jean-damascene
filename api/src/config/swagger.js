import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Task Management API',
            version: '1.0.0',
            description: `
Task Management System API documentation.

Features:
- Authentication with JWT
- Task CRUD
- Optimistic concurrency control
- Task assignment
- Activity logs
- User management
            `
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server'
            }
        ],
        security: [
            {
                BearerAuth: []
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' }
                    }
                },
                Task: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        status: {
                            type: 'string',
                            enum: ['OPEN', 'IN_PROGRESS', 'DONE']
                        },
                        assigned_user_id: { type: 'integer' },
                        version: { type: 'integer' }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

export default swaggerJsdoc(swaggerOptions);
