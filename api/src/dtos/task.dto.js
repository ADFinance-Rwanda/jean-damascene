export const toCreateTaskDto = (body) => {
    const { title, description, assigned_user_id } = body;

    if (!title || !description) {
        throw new Error('Title and description are required');
    }

    return {
        title,
        description,
        assigned_user_id: assigned_user_id || null
    };
};

export const toUpdateTaskDto = (body) => {
    const { status, version } = body;

    if (!status || version === undefined || version === null) {
        throw new Error('Status and version are required');
    }

    return { status, version };
};


export const toUpdateTaskByIdDto = (body) => {
    const { title, description, newComment } = body;

    if (!title || !description) {
        throw new Error('title and description are required');
    }

    return { title, description, newComment };
};

export const toAssignTaskDto = (body) => {
    const { user_id, version } = body;

    if (!user_id || version === undefined || version === null) {
        throw new Error('user_id and version are required');
    }

    return { user_id, version };
};
