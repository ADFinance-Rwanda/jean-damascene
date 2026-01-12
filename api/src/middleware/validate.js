
export function validate(fields) {
    return (req, res, next) => {
        const errors = [];

        fields.forEach(f => {
            if (req.body[f] === undefined || req.body[f] === null || req.body[f] === '') {
                errors.push(`${f} is required`);
            }
        });

        if (errors.length) {
            return res.status(400).json({
                message: 'Please fill all the required fields',
                errors
            });
        }

        next();
    };
}