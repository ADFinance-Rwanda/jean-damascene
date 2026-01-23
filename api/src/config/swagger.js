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
- Task CRUD
- Task status updates with optimistic locking
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
        components: {
            schemas: {
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
                        assigned_user_id: { type: 'integer', nullable: true },
                        version: { type: 'integer' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },

                ActivityLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        action_type: { type: 'string' },
                        old_value: { type: 'string', nullable: true },
                        new_value: { type: 'string', nullable: true },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },

                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        email: { type: 'string' }
                    }
                }
            }
        }
    },

    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;
