export const toCreateUserDto = (body) => ({
    name: body.name,
    email: body.email
});

export const toUpdateUserDto = (body) => ({
    name: body.name,
    email: body.email
});