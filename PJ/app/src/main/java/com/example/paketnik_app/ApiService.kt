import com.example.paketnik_app.LoginRequest
import com.example.paketnik_app.LoginResponse
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("/login")
    fun loginUser(@Body request: LoginRequest): Call<LoginResponse>
}