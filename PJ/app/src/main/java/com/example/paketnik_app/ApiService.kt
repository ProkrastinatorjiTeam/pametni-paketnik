import com.example.paketnik_app.LoginRequest
import com.example.paketnik_app.LoginResponse
import com.example.paketnik_app.RegisterRequest
import com.example.paketnik_app.RegisterResponse
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("user/login")
    fun loginUser(@Body request: LoginRequest): Call<LoginResponse>

    @POST("user/register")
    fun registerUser(@Body request: RegisterRequest): Call<RegisterResponse>

    @POST("box/check-access")
    fun openBox(@Body body: Map<String, Int>): Call<Void>
}