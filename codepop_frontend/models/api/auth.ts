// this is where we create functions to interface with the backend for authentication.

export async function signIn(email: string, password: string) {
    const response = await fetch("/api/auth/sign_in", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to sign in");
    }

    return response.json();
}

export async function signUp(email: string, password: string, firstName: string, lastName: string) {
    const response = await fetch("/api/auth/sign_up", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to sign up");
    }

    return response.json();
}