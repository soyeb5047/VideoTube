class ApiError extends Error{
    constructor(
        statusCode, 
        message="Something went wrong..!",
        stack="", 
        error = []
    ){
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.stack = stack
        this.success = false
    }
}

export {ApiError}