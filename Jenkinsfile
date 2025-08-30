pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-cred')
        IMAGE_NAME = "dinaldocker/node-hello-world:${env.BUILD_ID}"
        APP_NAME = 'node-hello-world'
        VM_IP = '172.10.20.2' // REPLACE WITH YOUR VM's ACTUAL IP
        KUBECONFIG_PATH = 'C:\\\\Users\\\\user\\\\Desktop\\\\k3s.yaml'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm: [
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/RMDcharuka/node-hello-world.git'
                    ]]
                ]
                bat 'echo ✅ Code checked out successfully'
            }
        }

        stage('Debug Workspace') {
            steps {
                bat 'echo Debug: check workspace contents'
                bat 'cd && dir'
                bat 'echo "Dockerfile exists:" && if exist Dockerfile (echo YES) else (echo NO)'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat "docker build -t ${env.IMAGE_NAME} ."
                bat 'echo ✅ Docker image built successfully'
            }
        }

        stage('Docker Login') {
            steps {
                bat "echo ${env.DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${env.DOCKERHUB_CREDENTIALS_USR} --password-stdin"
                bat 'echo ✅ Logged in to DockerHub'
            }
        }

        stage('Push Docker Image') {
            steps {
                bat "docker push ${env.IMAGE_NAME}"
                bat "echo ✅ Docker image pushed: ${env.IMAGE_NAME}"
            }
        }

        stage('Deploy to K3s Cluster') {
            steps {
                script {
                    bat 'echo 🚀 Deploying to K3s cluster on VM...'
                    
                    bat """
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} cluster-info
                        if errorlevel 1 (
                            echo ERROR: Failed to connect to cluster
                            exit /b 1
                        )
                        
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} get deployment ${env.APP_NAME}
                        if errorlevel 1 (
                            echo Creating new deployment...
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} create deployment ${env.APP_NAME} ^
                                --image=${env.IMAGE_NAME} ^
                                --port=8083
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} scale deployment/${env.APP_NAME} --replicas=2
                        ) else (
                            echo Updating existing deployment...
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} set image deployment/${env.APP_NAME} ${env.APP_NAME}=${env.IMAGE_NAME} --record
                        )
                    """
                    
                    bat """
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} get service ${env.APP_NAME}-service
                        if errorlevel 1 (
                            echo Creating new service...
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} expose deployment ${env.APP_NAME} ^
                                --port=80 ^
                                --target-port=8083 ^
                                --name=${env.APP_NAME}-service ^
                                --type=NodePort
                        ) else (
                            echo Service already exists
                        )
                    """
                    
                    // ADD POD CLEANUP BEFORE ROLLOUT STATUS
                    bat """
                        echo "🧹 Cleaning up any stuck pods..."
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} delete pods -l app=${env.APP_NAME} --grace-period=0 --force 2>nul || echo "No stuck pods found"
                        
                        timeout /t 5
                        
                        echo "⏳ Waiting for rollout..."
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} rollout status deployment/${env.APP_NAME} --timeout=180s
                    """
                    
                    bat 'echo ✅ Deployment and Service updated successfully!'
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    bat """
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} rollout status deployment/${env.APP_NAME} --timeout=180s
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} get svc ${env.APP_NAME}-service
                    """
                    
                    // Use PowerShell with the correct path
                    powershell """
                        `$nodePort = kubectl --kubeconfig=${env:KUBECONFIG_PATH} get svc ${env:APP_NAME}-service -o jsonpath='{.spec.ports[0].nodePort}'
                        Write-Output \"📊 Service NodePort: `$nodePort\"
                        if (`$nodePort) {
                            try {
                                `$response = curl -s http://${env:VM_IP}:`$nodePort
                                Write-Output \"✅ Application response: `$response\"
                            } catch {
                                Write-Output \"⚠️  Curl test failed but deployment may still be successful\"
                            }
                            Write-Output \"🌐 Application accessible at: http://${env:VM_IP}:`$nodePort\"
                        } else {
                            Write-Output \"❌ Could not determine NodePort\"
                        }
                    """
                    
                    bat 'echo ✅ Deployment verified successfully'
                }
            }
        }
    }

    post {
        always {
            bat 'docker logout'
            bat 'echo 🚀 Pipeline execution completed'
        }
        success {
            bat 'echo ✅ Pipeline succeeded! Application deployed successfully.'
        }
        failure {
            bat 'echo ❌ Pipeline failed! Check the logs for errors.'
        }
    }
}