export const toCreateUserDto = (body) => ({
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role
});

export const toUpdateUserDto = (body) => ({
    name: body.name,
    email: body.email,
    role: body.role
});